const express = require('express');
const validate = require('../middleware/validate');
const {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  searchUsersQuerySchema
} = require('../validations/userSchemas');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const router = express.Router();

// @route   GET api/users
// @desc    Get all users
// @access  Private
router.get('/', auth, authorize('admin'), userController.getAllUsers);

// @route   GET api/users/search
// @desc    Search users
// @access  Private
router.get('/search', auth, authorize('admin'), validate(searchUsersQuerySchema, 'query'), userController.searchUsers);

// @route   GET api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', auth, authorize('admin'), userController.getUserStats);

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, authorize('admin'), validate(userIdParamSchema, 'params'), userController.getUserById);

// @route   POST api/users
// @desc    Create a new user
// @access  Private
router.post('/', auth, authorize('admin'), validate(createUserSchema), userController.createUser);

// @route   PUT api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', auth, authorize('admin'), validate(userIdParamSchema, 'params'), validate(updateUserSchema), userController.updateUser);

// @route   PATCH api/users/:id
// @desc    Update user
// @access  Private
router.patch('/:id', auth, authorize('admin'), validate(userIdParamSchema, 'params'), validate(updateUserSchema), userController.updateUser);

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Private
router.delete('/:id', auth, authorize('admin'), userController.deleteUser);

module.exports = router;
