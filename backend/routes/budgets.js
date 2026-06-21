const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');
const { sendBudgetAlert } = require('../services/emailService');

const verifyMember = async (groupId, userId) => {
  const group = await Group.findById(groupId).populate('members', 'name email');
  if (!group) return { error: 'Group not found', status: 404 };
  if (!group.members.some((m) => m._id.toString() === userId.toString()))
    return { error: 'Access denied', status: 403 };
  return { group };
};

// GET /api/budgets/group/:groupId?month=&year=
router.get('/group/:groupId', protect, async (req, res, next) => {
  try {
    const { group, error, status } = await verifyMember(req.params.groupId, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year  = parseInt(req.query.year)  || now.getFullYear();

    const budgets = await Budget.find({ groupId: req.params.groupId, month, year });

    // compute spent per category for this month
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);
    const expenses = await Expense.find({ groupId: req.params.groupId, date: { $gte: start, $lte: end } });

    const spent = {};
    expenses.forEach((e) => { spent[e.category] = (spent[e.category] || 0) + e.amount; });

    const result = budgets.map((b) => ({
      ...b.toObject(),
      spent: Math.round((spent[b.category] || 0) * 100) / 100,
      percentage: Math.round(((spent[b.category] || 0) / b.limit) * 100),
    }));

    res.json({ success: true, budgets: result, month, year });
  } catch (err) { next(err); }
});

// POST /api/budgets/group/:groupId
router.post('/group/:groupId', protect, async (req, res, next) => {
  try {
    const { group, error, status } = await verifyMember(req.params.groupId, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    const { category, limit, month, year } = req.body;
    if (!category || !limit || !month || !year)
      return res.status(400).json({ success: false, message: 'category, limit, month, year are required' });

    const budget = await Budget.findOneAndUpdate(
      { groupId: req.params.groupId, category, month: parseInt(month), year: parseInt(year) },
      { limit: parseFloat(limit), createdBy: req.user._id },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, budget });
  } catch (err) { next(err); }
});

// DELETE /api/budgets/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    const { error, status } = await verifyMember(budget.groupId, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });
    await budget.deleteOne();
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Internal helper — called after expense creation to check budgets
const checkBudgetOnExpense = async (expense) => {
  try {
    const now = new Date(expense.date || Date.now());
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const budget = await Budget.findOne({ groupId: expense.groupId, category: expense.category, month, year });
    if (!budget) return;

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);
    const agg = await Expense.aggregate([
      { $match: { groupId: expense.groupId, category: expense.category, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const spent = agg[0]?.total || 0;

    if (spent >= budget.limit) {
      const group = await Group.findById(expense.groupId).populate('members', 'name email');
      const spentRounded = Math.round(spent * 100) / 100;

      await Promise.all(group.members.map(async (member) => {
        await createNotification(member._id, {
          type: 'budget_exceeded',
          title: `Budget exceeded — ${expense.category}`,
          message: `${expense.category} budget of ₹${budget.limit} exceeded (₹${spentRounded} spent) in ${group.name}`,
          link: '/reports',
          meta: { groupId: expense.groupId, category: expense.category, spent: spentRounded, limit: budget.limit },
        });
        if (member.email) {
          sendBudgetAlert(member.email, {
            userName: member.name,
            groupName: group.name,
            category: expense.category,
            spent: spentRounded,
            limit: budget.limit,
          });
        }
      }));
    }
  } catch (err) {
    console.error('Budget check error:', err.message);
  }
};

module.exports = router;
module.exports.checkBudgetOnExpense = checkBudgetOnExpense;
