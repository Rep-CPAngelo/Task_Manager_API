const express = require('express');
const healthController = require('../controllers/healthController');
const router = express.Router();

// @route   GET api/health
// @desc    Basic health check
// @access  Public
router.get('/', healthController.getHealth);

// @route   GET api/health/status
// @desc    Detailed health status
// @access  Public
router.get('/status', healthController.getDetailedHealth);

// @route   GET api/health/system
// @desc    System information
// @access  Public
router.get('/system', healthController.getSystemInfo);

// @route   GET api/health/database
// @desc    Database health check
// @access  Public
router.get('/database', healthController.getDatabaseHealth);

module.exports = router;
