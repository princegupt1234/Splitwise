const cron = require('node-cron');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const { getCategoryWiseSummary, getMemberWiseSummary, calculateBalances } = require('./settlementService');
const { sendMonthlyReport } = require('./emailService');
const { createNotification } = require('./notificationService');

const sendMonthlyReports = async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  console.log(`📊 Sending monthly reports for ${month}/${year}...`);

  try {
    const groups = await Group.find().populate('members', 'name username email');

    for (const group of groups) {
      const expenses = await Expense.find({ groupId: group._id, date: { $gte: startDate, $lte: endDate } })
        .populate('paidBy', 'name username')
        .populate('splitAmong', 'name username');

      if (expenses.length === 0) continue;

      const totalExpense = Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;
      const categoryWise = getCategoryWiseSummary(expenses);
      const memberWise = getMemberWiseSummary(expenses, group.members);
      const settledPayments = await Settlement.find({ groupId: group._id, status: 'settled' });
      const balances = calculateBalances(expenses, group.members.map((m) => m._id), settledPayments);

      for (const member of group.members) {
        const uid = member._id.toString();
        const myPaid = Math.round(
          expenses.filter((e) => e.paidBy._id.toString() === uid).reduce((s, e) => s + e.amount, 0) * 100
        ) / 100;
        const myShare = Math.round(
          expenses.filter((e) => e.splitAmong.some((m) => m._id.toString() === uid))
            .reduce((s, e) => s + e.amount / e.splitAmong.length, 0) * 100
        ) / 100;
        const myBalance = Math.round((balances[uid] || 0) * 100) / 100;

        // In-app notification
        await createNotification(member._id, {
          type: 'monthly_report',
          title: `Monthly report ready — ${group.name}`,
          message: `Your ${new Date(year, month - 1).toLocaleString('en-US', { month: 'long' })} ${year} summary: ₹${totalExpense} total expenses.`,
          link: '/reports',
          meta: { groupId: group._id, month, year },
        });

        // Email
        if (member.email) {
          sendMonthlyReport(member.email, {
            userName: member.name,
            groupName: group.name,
            month,
            year,
            totalExpense,
            myPaid,
            myShare,
            myBalance,
            categoryWise,
            memberWise,
          });
        }
      }
      console.log(`  ✅ Sent reports for group: ${group.name}`);
    }
  } catch (err) {
    console.error('Monthly report scheduler error:', err.message);
  }
};

// Runs at 8:00 AM on the last day of every month
// "0 8 28-31 * *" + day check inside handles last-day logic
const startScheduler = () => {
  cron.schedule('0 8 28-31 * *', async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Only run if tomorrow is a new month (i.e., today is last day)
    if (tomorrow.getMonth() !== now.getMonth()) {
      await sendMonthlyReports();
    }
  });
  console.log('📅 Monthly report scheduler started');
};

module.exports = { startScheduler, sendMonthlyReports };
