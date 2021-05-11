import crypto from 'crypto';
import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import ErrorHandler from '../utils/errorHandler.js';
import { sendToken } from '../utils/jwtToken.js';
import { sendEmail } from '../utils/sendEmail.js';

// @desc    Register User
// @route   GET /api/v1/register
// @access  PUBLIC
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  const user = await User.create({ name, email, password, role });

  sendToken(user, 201, res);
});

// @desc    Login User
// @route   GET /api/v1/login
// @access  PUBLIC
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler('Please enter email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorHandler('Invalid Credentials', 401));
  }

  const matchPassword = await user.checkPassword(password);

  if (!matchPassword) {
    return next(new ErrorHandler('Invalid Credentials', 401));
  }

  sendToken(user, 200, res);
});

// @desc    Forgot Password
// @route   POST /api/v1/password/forgot
// @access  PUBLIC
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  const resetToken = user.generateResetPasswordToken();

  await user.save({ validateBeforeSave: true });

  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/password/reset/${resetToken}`;

  const message = `Your password link is as follows:\n${resetUrl}\n\nIf you have not requested this then please ignore.`;

  const config = {
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    text: message,
    to: user.email,
    subject: 'Jobbee Reset Password Recovery',
  };

  try {
    await sendEmail(config);

    res.status(200).json({
      success: true,
      message: `Email sent successfully to ${user.email}`,
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: true });

    res.status(500).json({
      success: true,
      message: `Problem occurred while sending the recovery email`,
    });
  }
});

// @desc    Reset Password
// @route   POST /api/v1/password/reset/:token
// @access  PUBLIC
export const resetPassword = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorHandler('Reset password token is invalid', 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  sendToken(user, 200, res);
});

// @desc    Logout User
// @route   get /api/v1/logout
// @access  PUBLIC
export const logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({ success: true, message: 'User logout successfully' });
});
