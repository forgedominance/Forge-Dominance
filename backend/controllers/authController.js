const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { validationResult } = require('express-validator');

const authController = {
  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      const user = await User.create(email, password, 'admin');
      const accessToken = generateAccessToken(user.id, user.email, user.role);
      const refreshToken = generateRefreshToken(user.id);

      res.status(201).json({
        message: 'User registered successfully',
        user: { id: user.id, email: user.email, role: user.role },
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('[Auth] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await User.findByEmail(email) || await User.findByUsername?.(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isPasswordValid = await User.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const normalizedRole = String(user.role || '').toLowerCase() === 'super_admin' ? 'superadmin' : String(user.role || '').toLowerCase();
      const accessToken = generateAccessToken(user.id, user.email, normalizedRole);
      const refreshToken = generateRefreshToken(user.id);

      res.json({
        message: 'Login successful',
        user: { id: user.id, email: user.email, role: normalizedRole },
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('[Auth] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const accessToken = generateAccessToken(user.id, user.email, user.role);
      res.json({ accessToken });
    } catch (error) {
      console.error('[Auth] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('[Auth] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  logout: (req, res) => {
    res.json({ message: 'Logout successful' });
  }
};

module.exports = authController;
