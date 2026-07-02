const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

function isSuperAdminRequest(req) {
  return String(req.user?.role || '').toLowerCase() === 'superadmin';
}

router.get('/', authenticate, authorize('admin'), async (_req, res) => {
  try {
    const users = await User.getAll();
    res.json({ data: users });
  } catch (error) {
    console.error('[Users] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }
    const generatedPassword = password || Math.random().toString(36).slice(-10) + 'A1!';
    const user = await User.create(email, generatedPassword, role || 'admin');
    res.status(201).json({ data: user });
  } catch (error) {
    console.error('[Users] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.patch('/:id/role', authenticate, authorize('admin'), async (req, res) => {
  try {
    if (!isSuperAdminRequest(req)) {
      return res.status(403).json({ error: 'Only super admin can change roles' });
    }
    const { role } = req.body || {};
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }
    const user = await User.updateRole(req.params.id, role);
    res.json({ data: user });
  } catch (error) {
    console.error('[Users] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.patch('/:id/password', authenticate, authorize('admin'), async (req, res) => {
  try {
    if (!isSuperAdminRequest(req)) {
      return res.status(403).json({ error: 'Only super admin can change passwords' });
    }
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    const user = await User.updatePassword(req.params.id, password);
    res.json({ data: user });
  } catch (error) {
    console.error('[Users] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    if (!isSuperAdminRequest(req)) {
      return res.status(403).json({ error: 'Only super admin can delete users' });
    }
    const targetId = req.params.id;
    if (String(targetId) === String(req.user?.userId)) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const targetUser = await User.findById(targetId);
    if (targetUser && String(targetUser.role || '').toLowerCase() === 'superadmin') {
      return res.status(403).json({ error: 'Cannot delete a super admin account' });
    }
    await User.delete(targetId);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('[Users] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

module.exports = router;


