const express = require('express');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  refreshSchema
} = require('../validations/authSchemas');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validate(registerSchema), authController.register);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', validate(loginSchema), authController.login);

// @route   GET api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, authController.getProfile);

// @route   PUT api/auth/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', auth, validate(updateProfileSchema), authController.updateProfile);

// @route   PUT api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, validate(changePasswordSchema), authController.changePassword);

// @route   POST api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', validate(refreshSchema), authController.refresh);

// @route   POST api/auth/logout
// @desc    Logout (revoke refresh token)
// @access  Public
router.post('/logout', validate(refreshSchema), authController.logout);

module.exports = router;
