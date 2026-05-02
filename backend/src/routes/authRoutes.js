const express = require('express');
const {
  registerUser,
  verifyOTP,
  loginUser,
  getMe,
  requestPasswordReset,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginUser);
router.post('/forgotpassword', requestPasswordReset);
router.get('/me', protect, getMe);
router.put('/changepassword', protect, changePassword);

module.exports = router;
