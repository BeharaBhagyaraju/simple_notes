const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint — returns server & database status
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: {
      environment: process.env.NODE_ENV || 'development',
      uptime: `${Math.floor(process.uptime())}s`,
    },
    database: {
      status: dbStates[dbState] || 'unknown',
      name: mongoose.connection.name || 'not connected',
    },
  });
});

module.exports = router;
