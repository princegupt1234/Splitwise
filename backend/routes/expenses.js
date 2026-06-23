const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User');
const { calculateBalances, generateSettlements } = require('../services/settlementService');
const { checkBudgetOnExpense } = require('./budgets');
const { createNotification } = require('../services/notificationService');
const { sendExpenseAdded } = require('../services/emailService');

// Helper: verify group membership
const verifyMembership = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) return { error: 'Group not found', status: 404 };
  const isMember = group.members.some((m) => m.toString() === userId.toString());
  if (!isMember) return { error: 'Access denied', status: 403 };
  return { group };
};

// @route  POST /api/expenses
// @desc   Add a new expense
// @access Private
router.post('/', protect, async (req, res, next) => {
  try {
    const { groupId, title, amount, category, paidBy, splitAmong, date, notes } = req.body;

    if (!groupId || !title || !amount || !category || !paidBy || !splitAmong?.length) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const { group, error, status } = await verifyMembership(groupId, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    const expense = await Expense.create({
      groupId,
      title: title.trim(),
      amount: parseFloat(amount),
      category,
      paidBy,
      splitAmong,
      createdBy: req.user._id,
      date: date || Date.now(),
      notes: notes || '',
    });

    await expense.populate('paidBy', 'name username');
    await expense.populate('splitAmong', 'name username');
    await expense.populate('createdBy', 'name username');

    // notify other group members
    const grpForNotif = await Group.findById(groupId);
    if (grpForNotif) {
      const othersIds = grpForNotif.members.filter((m) => m.toString() !== req.user._id.toString());
      await Promise.all(othersIds.map((uid) =>
        createNotification(uid, {
          type: 'expense_added',
          title: `New expense in ${grpForNotif.name}`,
          message: `${req.user.name} added "${title.trim()}" — ₹${parseFloat(amount)}`,
          link: '/expenses',
          meta: { groupId, expenseId: expense._id },
        })
      ));
      // send email to other members
      const otherUsers = await User.find({ _id: { $in: othersIds }, email: { $exists: true, $ne: '' } });
      otherUsers.forEach((u) => {
        sendExpenseAdded(u.email, {
          memberName: u.name,
          addedBy: req.user.name,
          expenseTitle: title.trim(),
          amount: parseFloat(amount),
          groupName: grpForNotif.name,
        }).catch(() => {});
      });
    }

    // check budget limits
    checkBudgetOnExpense(expense).catch(() => {});

    res.status(201).json({ success: true, expense });
  } catch (error) {
    next(error);
  }
});

// @route  GET /api/expenses/group/:groupId
// @desc   Get all expenses for a group
// @access Private
router.get('/group/:groupId', protect, async (req, res, next) => {
  try {
    const { error, status } = await verifyMembership(req.params.groupId, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    const { month, year, category } = req.query;
    const filter = { groupId: req.params.groupId };

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (category) filter.category = category;

    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name username')
      .populate('splitAmong', 'name username')
      .populate('createdBy', 'name username')
      .sort({ date: -1 });

    // Calculate totals
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({ success: true, expenses, totalAmount });
  } catch (error) {
    next(error);
  }
});

// @route  GET /api/expenses/group/:groupId/export-pdf
// @desc   Return expense data for PDF (used by frontend jsPDF)
// @access Private
router.get('/group/:groupId/export', protect, async (req, res, next) => {
  try {
    const { error, status } = await verifyMembership(req.params.groupId, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    const { month, year, category } = req.query;
    const filter = { groupId: req.params.groupId };
    if (month && year) {
      filter.date = { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0, 23, 59, 59) };
    }
    if (category) filter.category = category;

    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name')
      .populate('splitAmong', 'name')
      .sort({ date: -1 });

    const group = await Group.findById(req.params.groupId);
    res.json({ success: true, expenses, groupName: group?.name });
  } catch (err) { next(err); }
});

// @route  GET /api/expenses/group/:groupId/balances
// @desc   Get balance summary for a group
// @access Private
router.get('/group/:groupId/balances', protect, async (req, res, next) => {
  try {
    const { group, error, status } = await verifyMembership(req.params.groupId, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    const expenses = await Expense.find({ groupId: req.params.groupId });
    const balances = calculateBalances(expenses, group.members);
    const settlements = generateSettlements(balances);

    res.json({ success: true, balances, settlements });
  } catch (error) {
    next(error);
  }
});

// @route  GET /api/expenses/:id
// @desc   Get single expense
// @access Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('paidBy', 'name username')
      .populate('splitAmong', 'name username')
      .populate('createdBy', 'name username');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, expense });
  } catch (error) {
    next(error);
  }
});

// @route  PUT /api/expenses/:id
// @desc   Update an expense
// @access Private
router.put('/:id', protect, async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (expense.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this expense' });
    }

    const { title, amount, category, paidBy, splitAmong, date, notes } = req.body;
    const updates = {};
    if (title) updates.title = title;
    if (amount) updates.amount = parseFloat(amount);
    if (category) updates.category = category;
    if (paidBy) updates.paidBy = paidBy;
    if (splitAmong) updates.splitAmong = splitAmong;
    if (date) updates.date = date;
    if (notes !== undefined) updates.notes = notes;

    const updated = await Expense.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('paidBy', 'name username')
      .populate('splitAmong', 'name username');

    res.json({ success: true, expense: updated });
  } catch (error) {
    next(error);
  }
});

// @route  DELETE /api/expenses/:id
// @desc   Delete an expense
// @access Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (expense.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this expense' });
    }

    await expense.deleteOne();
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
