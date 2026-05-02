const User = require('../models/User');
const ResetRequest = require('../models/ResetRequest');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * @desc    Register a new user & send OTP
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return next(new ApiError(400, 'Please add all fields'));
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      if (userExists.isVerified) {
        return next(new ApiError(400, 'User already exists and is verified. Please log in.'));
      }
      // If user exists but not verified, we can just resend OTP or update password
      // For simplicity, we'll overwrite their password and resend OTP
      userExists.password = password; // Will be hashed by pre-save hook
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      userExists.otp = otp;
      userExists.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
      await userExists.save();

      // Send OTP Email
      await sendOTPEmail(userExists.email, otp);

      return res.status(200).json({
        success: true,
        message: 'OTP sent to email. Please verify.',
        email: userExists.email
      });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      otp,
      otpExpiry,
    });

    // Send OTP Email
    await sendOTPEmail(user.email, otp);

    res.status(201).json({
      success: true,
      message: 'User registered. OTP sent to email. Please verify.',
      email: user.email
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return next(new ApiError(400, 'Please provide email and OTP'));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    if (user.isVerified) {
      return next(new ApiError(400, 'User is already verified'));
    }

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return next(new ApiError(400, 'Invalid or expired OTP'));
    }

    // Mark user as verified and clear OTP
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Auth user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ApiError(400, 'Please add email and password'));
    }

    // Check for user email, select password because it's excluded by default
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ApiError(401, 'Invalid credentials'));
    }

    if (!user.isVerified) {
      return next(new ApiError(401, 'Please verify your email first'));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ApiError(401, 'Invalid credentials'));
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request password reset
 * @route   POST /api/auth/forgotpassword
 * @access  Public
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new ApiError(400, 'Please provide email'));

    const user = await User.findOne({ email });
    if (!user) return next(new ApiError(404, 'No user found with this email'));

    // Check if pending request exists
    const existingRequest = await ResetRequest.findOne({ user: user._id, status: 'pending' });
    if (existingRequest) {
      return res.status(200).json({
        success: true,
        message: 'A pending reset request already exists. Please wait for an Admin to review it.',
      });
    }

    await ResetRequest.create({ user: user._id });

    res.status(200).json({
      success: true,
      message: 'Password reset request submitted. An Admin will review it shortly.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password (self-service)
 * @route   PUT /api/auth/changepassword
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return next(new ApiError(400, 'Please provide old password and new password'));
    }

    if (newPassword.length < 6) {
      return next(new ApiError(400, 'New password must be at least 6 characters'));
    }

    // Get user with password field
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    // Verify old password
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return next(new ApiError(401, 'Current password is incorrect'));
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to send email
const sendOTPEmail = async (email, otp) => {
  const message = `Your verification OTP is: ${otp}. It is valid for 10 minutes.`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0F172A; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
      <div style="background: linear-gradient(135deg, #6366F1, #818CF8); padding: 32px 24px; text-align: center;">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 24px;">📧 Email Verification</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Simple Notes</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #E2E8F0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Welcome to Simple Notes!
        </p>
        <p style="color: #94A3B8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Use the OTP below to verify your email address:
        </p>
        <div style="background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
          <p style="color: #94A3B8; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
          <p style="color: #818CF8; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: monospace;">${otp}</p>
        </div>
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 14px; margin: 0 0 24px;">
          <p style="color: #FBBF24; font-size: 13px; margin: 0;">
            ⏰ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
          </p>
        </div>
        <p style="color: #64748B; font-size: 13px; margin: 0; text-align: center;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
      <div style="background: #1E293B; padding: 16px 24px; text-align: center; border-top: 1px solid #334155;">
        <p style="color: #475569; font-size: 12px; margin: 0;">© Simple Notes App</p>
      </div>
    </div>
  `;

  // Fallback for development if email is not configured
  if (
    !process.env.EMAIL_USER || 
    !process.env.EMAIL_PASS || 
    process.env.EMAIL_USER === 'your-email@gmail.com'
  ) {
    console.log(`\n==== DEVELOPMENT MODE: OTP for ${email} is ${otp} ====\n`);
    return;
  }

  await sendEmail({
    email,
    subject: 'Simple Notes - Email Verification',
    message,
    html,
  });
};

module.exports = {
  registerUser,
  verifyOTP,
  loginUser,
  getMe,
  requestPasswordReset,
  changePassword,
};
