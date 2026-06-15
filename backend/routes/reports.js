const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const { getCategoryWiseSummary, getMemberWiseSummary, calculateBalances } = require('../services/settlementService');

// @route  GET /api/reports/group/:groupId
// @desc   Get monthly report for a group
// @access Private
router.get('/group/:groupId', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('members', 'name username');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const isMember = group.members.some((m) => m._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    const { month, year } = req.query;
    const currentDate = new Date();
    const reportMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const reportYear = year ? parseInt(year) : currentDate.getFullYear();

    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59);

    const expenses = await Expense.find({
      groupId: req.params.groupId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate('paidBy', 'name username')
      .populate('splitAmong', 'name username');

    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryWise = getCategoryWiseSummary(expenses);
    const memberWise = getMemberWiseSummary(expenses, group.members);

    // Settlement summary for this month
    const settlements = await Settlement.find({
      groupId: req.params.groupId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate('from', 'name username')
      .populate('to', 'name username');

    res.json({
      success: true,
      report: {
        month: reportMonth,
        year: reportYear,
        groupName: group.name,
        totalExpense: Math.round(totalExpense * 100) / 100,
        totalExpenses: expenses.length,
        categoryWise,
        memberWise,
        settlements,
        expenses,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route  GET /api/reports/group/:groupId/summary
// @desc   Get overall summary (all time)
// @access Private
router.get('/group/:groupId/summary', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('members', 'name username');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const isMember = group.members.some((m) => m._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    const expenses = await Expense.find({ groupId: req.params.groupId })
      .populate('paidBy', 'name username')
      .populate('splitAmong', 'name username');

    // Settled payments — needed for correct balance calculation
    const settledPayments = await Settlement.find({
      groupId: req.params.groupId,
      status: 'settled',
    });

    // Current month
    const now = new Date();
    const currentMonthExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalExpense      = expenses.reduce((sum, e) => sum + e.amount, 0);
    const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const userId  = req.user._id.toString();
    const myPaid  = expenses
      .filter((e) => e.paidBy._id.toString() === userId)
      .reduce((sum, e) => sum + e.amount, 0);
    const myShare = expenses
      .filter((e) => e.splitAmong.some((m) => m._id.toString() === userId))
      .reduce((sum, e) => sum + e.amount / e.splitAmong.length, 0);

    // Net balance = expense balance adjusted by settled payments
    const balances   = calculateBalances(expenses, group.members, settledPayments);
    const myBalance  = Math.round((balances[userId] || 0) * 100) / 100;
    const memberWise = getMemberWiseSummary(expenses, group.members);

    res.json({
      success: true,
      summary: {
        groupName: group.name,
        groupCode: group.code,
        totalMembers: group.members.length,
        totalExpense: Math.round(totalExpense * 100) / 100,
        currentMonthTotal: Math.round(currentMonthTotal * 100) / 100,
        myPaid: Math.round(myPaid * 100) / 100,
        myShare: Math.round(myShare * 100) / 100,
        myBalance: Math.round(myBalance * 100) / 100,
        memberWise,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
