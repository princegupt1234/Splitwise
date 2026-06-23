const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Settlement = require('../models/Settlement');
const SettlementRequest = require('../models/SettlementRequest');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User');
const { calculateBalances, generateSettlements } = require('../services/settlementService');
const { createNotification } = require('../services/notificationService');
const { sendSettlementRequest, sendSettlementApproved, sendSettlementRejected } = require('../services/emailService');

// ─────────────────────────────────────────────────────────────
// EXISTING ROUTES (unchanged)
// ─────────────────────────────────────────────────────────────

// POST /api/settlements/generate/:groupId
router.post('/generate/:groupId', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    await Settlement.deleteMany({ groupId: req.params.groupId, status: 'pending' });

    const expenses = await Expense.find({ groupId: req.params.groupId });
    const settledPayments = await Settlement.find({ groupId: req.params.groupId, status: 'settled' });
    const partialPayments = await Settlement.find({ groupId: req.params.groupId, status: 'partially_settled' });

    // For balance calc: treat partially settled as settled for the paidAmount portion
    const effectiveSettled = [
      ...settledPayments,
      ...partialPayments.map((s) => ({ ...s.toObject(), amount: s.paidAmount })),
    ];

    const balances = calculateBalances(expenses, group.members, effectiveSettled);
    const settlementData = generateSettlements(balances);

    if (settlementData.length > 0) {
      await Settlement.insertMany(
        settlementData.map((s) => ({
          groupId: req.params.groupId,
          from: s.from,
          to: s.to,
          amount: s.amount,
          paidAmount: 0,
          status: 'pending',
        }))
      );
    }

    const populated = await Settlement.find({ groupId: req.params.groupId })
      .populate('from', 'name username')
      .populate('to', 'name username')
      .sort({ createdAt: -1 });

    res.json({ success: true, settlements: populated });
  } catch (error) { next(error); }
});

// GET /api/settlements/group/:groupId
router.get('/group/:groupId', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    const { status } = req.query;
    const filter = { groupId: req.params.groupId };
    if (status) filter.status = status;

    const settlements = await Settlement.find(filter)
      .populate('from', 'name username')
      .populate('to', 'name username')
      .populate('settledBy', 'name username')
      .sort({ createdAt: -1 });

    res.json({ success: true, settlements });
  } catch (error) { next(error); }
});

// PUT /api/settlements/:id/settle  (kept for backward compat — marks fully settled directly)
router.put('/:id/settle', protect, async (req, res, next) => {
  try {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });

    const group = await Group.findById(settlement.groupId);
    const isMember = group?.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    settlement.status = 'settled';
    settlement.paidAmount = settlement.amount;
    settlement.remainingAmount = 0;
    settlement.settledAt = new Date();
    settlement.settledBy = req.user._id;
    settlement.note = req.body.note || settlement.note;
    await settlement.save();

    await settlement.populate('from', 'name username');
    await settlement.populate('to', 'name username');

    // notify both parties
    const group = await Group.findById(settlement.groupId);
    await createNotification(settlement.from._id, {
      type: 'settlement_settled',
      title: 'Settlement marked as settled',
      message: `Your payment of ₹${settlement.amount} in ${group?.name || 'the group'} has been marked settled.`,
      link: '/settlements',
      meta: { settlementId: settlement._id },
    });
    await createNotification(settlement.to._id, {
      type: 'settlement_settled',
      title: `Payment received from ${settlement.from.name}`,
      message: `₹${settlement.amount} settlement in ${group?.name || 'the group'} has been completed.`,
      link: '/settlements',
      meta: { settlementId: settlement._id },
    });

    res.json({ success: true, message: 'Settlement marked as completed', settlement });
  } catch (error) { next(error); }
});

// PUT /api/settlements/:id/reopen
router.put('/:id/reopen', protect, async (req, res, next) => {
  try {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });
    settlement.status = 'pending';
    settlement.settledAt = undefined;
    settlement.settledBy = undefined;
    await settlement.save();
    res.json({ success: true, message: 'Settlement reopened', settlement });
  } catch (error) { next(error); }
});

// DELETE /api/settlements/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });
    if (settlement.status !== 'settled') {
      return res.status(400).json({ success: false, message: 'Only settled payments can be deleted' });
    }
    const group = await Group.findById(settlement.groupId);
    const isMember = group?.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });
    await settlement.deleteOne();
    res.json({ success: true, message: 'Settlement deleted' });
  } catch (error) { next(error); }
});

// ─────────────────────────────────────────────────────────────
// NEW ROUTES — Settlement Request Workflow
// ─────────────────────────────────────────────────────────────

// POST /api/settlements/:id/request
// Debtor submits a payment request (partial or full)
router.post('/:id/request', protect, async (req, res, next) => {
  try {
    const settlement = await Settlement.findById(req.params.id)
      .populate('from', 'name username')
      .populate('to', 'name username');
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });

    if (settlement.from._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the debtor can submit a payment request' });
    }
    if (settlement.status === 'settled') {
      return res.status(400).json({ success: false, message: 'This settlement is already fully settled' });
    }

    const { amount, note, receiptUrl } = req.body;
    const remaining = settlement.remainingAmount ?? settlement.amount;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Enter a valid amount' });
    }
    if (Number(amount) > remaining + 0.01) {
      return res.status(400).json({ success: false, message: `Amount cannot exceed remaining ₹${remaining}` });
    }

    const request = await SettlementRequest.create({
      settlementId: settlement._id,
      groupId: settlement.groupId,
      sender: req.user._id,
      receiver: settlement.to._id,
      amount: Number(amount),
      note: note || '',
      receiptUrl: receiptUrl || '',
    });

    await request.populate('sender', 'name username');
    await request.populate('receiver', 'name username');

    // notify receiver
    const group = await Group.findById(settlement.groupId);
    const receiver = await User.findById(settlement.to._id);
    await createNotification(settlement.to._id, {
      type: 'settlement_request',
      title: `Payment request from ${req.user.name}`,
      message: `${req.user.name} sent a payment of ₹${Number(amount)} in ${group?.name}`,
      link: '/settlements',
      meta: { settlementId: settlement._id, amount: Number(amount) },
    });
    if (receiver?.email) {
      sendSettlementRequest(receiver.email, {
        senderName: req.user.name,
        amount: Number(amount),
        groupName: group?.name,
      });
    }

    res.status(201).json({ success: true, message: 'Payment request sent', request });
  } catch (error) { next(error); }
});

// GET /api/settlements/:id/requests
// Get all payment requests for a settlement
router.get('/:id/requests', protect, async (req, res, next) => {
  try {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });

    const group = await Group.findById(settlement.groupId);
    const isMember = group?.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    const requests = await SettlementRequest.find({ settlementId: req.params.id })
      .populate('sender', 'name username')
      .populate('receiver', 'name username')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) { next(error); }
});

// GET /api/settlements/requests/pending/:groupId
// Get all pending requests FOR the logged-in user (as receiver) in a group
router.get('/requests/pending/:groupId', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    const requests = await SettlementRequest.find({
      groupId: req.params.groupId,
      receiver: req.user._id,
      status: 'pending',
    })
      .populate('sender', 'name username')
      .populate('receiver', 'name username')
      .populate('settlementId')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) { next(error); }
});

// PUT /api/settlements/requests/:requestId/approve
// Receiver approves a payment request
router.put('/requests/:requestId/approve', protect, async (req, res, next) => {
  try {
    const request = await SettlementRequest.findById(req.params.requestId)
      .populate('sender', 'name username')
      .populate('receiver', 'name username');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (request.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the receiver can approve' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    // Approve the request
    request.status = 'approved';
    request.confirmedAt = new Date();
    request.confirmedBy = req.user._id;
    await request.save();

    // Update settlement progress
    const settlement = await Settlement.findById(request.settlementId);
    settlement.paidAmount = Math.round(((settlement.paidAmount || 0) + request.amount) * 100) / 100;
    settlement.remainingAmount = Math.round((settlement.amount - settlement.paidAmount) * 100) / 100;

    if (settlement.remainingAmount <= 0.01) {
      settlement.status = 'settled';
      settlement.remainingAmount = 0;
      settlement.settledAt = new Date();
      settlement.settledBy = req.user._id;
    } else {
      settlement.status = 'partially_settled';
    }
    await settlement.save();

    await settlement.populate('from', 'name username');
    await settlement.populate('to', 'name username');

    // notify sender
    const senderUser = await User.findById(request.sender._id);
    const grp = await Group.findById(request.groupId);
    await createNotification(request.sender._id, {
      type: 'settlement_approved',
      title: `Payment confirmed by ${req.user.name}`,
      message: `₹${request.amount} payment approved in ${grp?.name}`,
      link: '/settlements',
      meta: { settlementId: settlement._id, amount: request.amount },
    });
    if (senderUser?.email) {
      sendSettlementApproved(senderUser.email, {
        receiverName: req.user.name,
        amount: request.amount,
        groupName: grp?.name,
      });
    }

    res.json({ success: true, message: 'Payment approved', request, settlement });
  } catch (error) { next(error); }
});

// PUT /api/settlements/requests/:requestId/reject
// Receiver rejects a payment request
router.put('/requests/:requestId/reject', protect, async (req, res, next) => {
  try {
    const request = await SettlementRequest.findById(req.params.requestId)
      .populate('sender', 'name username')
      .populate('receiver', 'name username');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (request.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the receiver can reject' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    request.status = 'rejected';
    request.rejectedAt = new Date();
    request.rejectedBy = req.user._id;
    request.rejectionReason = req.body.reason || '';
    await request.save();

    // notify sender
    const senderUser2 = await User.findById(request.sender._id);
    const grp2 = await Group.findById(request.groupId);
    await createNotification(request.sender._id, {
      type: 'settlement_rejected',
      title: `Payment rejected by ${req.user.name}`,
      message: `₹${request.amount} payment request was rejected in ${grp2?.name}`,
      link: '/settlements',
      meta: { settlementId: request.settlementId, amount: request.amount, reason: req.body.reason },
    });
    if (senderUser2?.email) {
      sendSettlementRejected(senderUser2.email, {
        receiverName: req.user.name,
        amount: request.amount,
        groupName: grp2?.name,
        reason: req.body.reason,
      });
    }

    res.json({ success: true, message: 'Payment request rejected', request });
  } catch (error) { next(error); }
});

module.exports = router;
