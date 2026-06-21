const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const adminAuth = require('../middleware/adminAuth');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

// ── POST /api/admin/login ────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password required' });

    const user = await User.findOne({ username: username.toLowerCase(), role: 'superadmin' }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    res.json({
      success: true,
      token: generateToken(user._id),
      admin: { _id: user._id, name: user.name, username: user.username, role: user.role },
    });
  } catch (err) { next(err); }
});

// ── GET /api/admin/stats ─────────────────────────────────────
router.get('/stats', adminAuth, async (req, res, next) => {
  try {
    const [totalUsers, totalGroups, totalExpenses, totalSettlements, bannedUsers] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Group.countDocuments(),
      Expense.countDocuments(),
      Settlement.countDocuments(),
      User.countDocuments({ isBanned: true }),
    ]);

    const expenseAgg = await Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalAmount = expenseAgg[0]?.total || 0;

    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      role: 'user',
    });

    res.json({ success: true, stats: { totalUsers, totalGroups, totalExpenses, totalSettlements, bannedUsers, totalAmount, newUsersToday } });
  } catch (err) { next(err); }
});

// ── GET /api/admin/users ─────────────────────────────────────
router.get('/users', adminAuth, async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const filter = { role: 'user' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── GET /api/admin/users/:id ─────────────────────────────────
router.get('/users/:id', adminAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const groups = await Group.find({ members: user._id }).populate('createdBy', 'name username');
    const expenses = await Expense.find({ createdBy: user._id }).sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, user, groups, expenses });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:id/ban ─────────────────────────────
router.put('/users/:id/ban', adminAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'superadmin') return res.status(400).json({ success: false, message: 'Cannot ban superadmin' });
    user.isBanned = true;
    await user.save();
    res.json({ success: true, message: `${user.name} banned`, user });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:id/unban ───────────────────────────
router.put('/users/:id/unban', adminAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isBanned = false;
    await user.save();
    res.json({ success: true, message: `${user.name} unbanned`, user });
  } catch (err) { next(err); }
});

// ── DELETE /api/admin/users/:id ──────────────────────────────
router.delete('/users/:id', adminAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'superadmin') return res.status(400).json({ success: false, message: 'Cannot delete superadmin' });
    await user.deleteOne();
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:id ─────────────────────────────────
router.put('/users/:id', adminAuth, async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, email }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

// ── GET /api/admin/groups ────────────────────────────────────
router.get('/groups', adminAuth, async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    const total = await Group.countDocuments(filter);
    const groups = await Group.find(filter)
      .populate('createdBy', 'name username')
      .populate('members', 'name username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, groups, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── DELETE /api/admin/groups/:id ─────────────────────────────
router.delete('/groups/:id', adminAuth, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    await group.deleteOne();
    res.json({ success: true, message: 'Group deleted' });
  } catch (err) { next(err); }
});

// ── GET /api/admin/expenses ──────────────────────────────────
router.get('/expenses', adminAuth, async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) filter.title = { $regex: search, $options: 'i' };
    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name username')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, expenses, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── DELETE /api/admin/expenses/:id ───────────────────────────
router.delete('/expenses/:id', adminAuth, async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    await expense.deleteOne();
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
