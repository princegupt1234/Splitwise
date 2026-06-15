const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');

// Generate a unique group code
const generateGroupCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// @route  POST /api/groups
// @desc   Create a new group
// @access Private
router.post('/', protect, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    // Generate unique code
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = generateGroupCode();
      const existing = await Group.findOne({ code });
      if (!existing) isUnique = true;
    }

    const group = await Group.create({
      name: name.trim(),
      code,
      createdBy: req.user._id,
      members: [req.user._id],
    });

    await group.populate('members', 'name username');
    await group.populate('createdBy', 'name username');

    res.status(201).json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

// @route  POST /api/groups/join
// @desc   Join a group using code
// @access Private
router.post('/join', protect, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Group code is required' });
    }

    const group = await Group.findOne({ code: code.trim().toUpperCase() });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found. Check the code.' });
    }

    // Already a member?
    if (group.members.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You are already in this group' });
    }

    group.members.push(req.user._id);
    await group.save();

    await group.populate('members', 'name username');
    await group.populate('createdBy', 'name username');

    res.json({ success: true, message: 'Joined group successfully', group });
  } catch (error) {
    next(error);
  }
});

// @route  GET /api/groups
// @desc   Get all groups for logged-in user
// @access Private
router.get('/', protect, async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name username')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 });

    res.json({ success: true, groups });
  } catch (error) {
    next(error);
  }
});

// @route  GET /api/groups/:id
// @desc   Get single group details
// @access Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name username')
      .populate('createdBy', 'name username');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is a member
    const isMember = group.members.some((m) => m._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied. Not a member.' });
    }

    res.json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

// @route  POST /api/groups/:id/invite
// @desc   Invite a user to group by username
// @access Private
router.post('/:id/invite', protect, async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Only members can invite
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const inviteUser = await User.findOne({ username: username.toLowerCase() });
    if (!inviteUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (group.members.includes(inviteUser._id)) {
      return res.status(400).json({ success: false, message: 'User is already in the group' });
    }

    group.members.push(inviteUser._id);
    await group.save();
    await group.populate('members', 'name username');

    res.json({ success: true, message: `${inviteUser.name} added to the group`, group });
  } catch (error) {
    next(error);
  }
});

// @route  DELETE /api/groups/:id/members/:memberId
// @desc   Admin removes a member from the group
// @access Private (admin only)
router.delete('/:id/members/:memberId', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group admin can remove members' });
    }

    if (req.params.memberId === group.createdBy.toString()) {
      return res.status(400).json({ success: false, message: 'Admin cannot be removed from the group' });
    }

    group.members = group.members.filter((m) => m.toString() !== req.params.memberId);
    await group.save();
    await group.populate('members', 'name username');
    await group.populate('createdBy', 'name username');

    res.json({ success: true, message: 'Member removed', group });
  } catch (error) {
    next(error);
  }
});

// @route  DELETE /api/groups/:id
// @desc   Admin deletes the entire group
// @access Private (admin only)
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group admin can delete the group' });
    }

    await group.deleteOne();
    res.json({ success: true, message: 'Group deleted' });
  } catch (error) {
    next(error);
  }
});

// @route  DELETE /api/groups/:id/leave
// @desc   Leave a group
// @access Private
router.delete('/:id/leave', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    group.members = group.members.filter((m) => m.toString() !== req.user._id.toString());
    await group.save();

    res.json({ success: true, message: 'Left the group successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
