import fs from 'fs';
import path from 'path';
import User from '../models/User.js';
import Job from '../models/Job.js';
import ErrorHandler from '../utils/errorHandler.js';
import asyncHandler from 'express-async-handler';
import { sendToken } from '../utils/jwtToken.js';
import ApiFilters from '../utils/apiFilters.js';

const __dirname = path.resolve();

// @desc    Get all users
// @route   GET /api/v1/users
// @access  ADMIN
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const apiFilters = new ApiFilters(User.find(), req.query)
    .filter()
    .paginate()
    .sort()
    .limitFields();

  const users = await apiFilters.query;

  res.status(200).json({
    success: true,
    result: users.length,
    data: users,
  });
});

// @desc    Get Current User Profile
// @route   POST /api/v1/me
// @access  PRIVATE
export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).populate(
    'jobsPosted',
    'title postingDate'
  );

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  return res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Update current user password
// @route   PUT /api/v1/password/update
// @access  PRIVATE
export const updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  const matchPassword = await user.checkPassword(req.body.currentPassword);

  if (!matchPassword) {
    return next(new ErrorHandler('Old Password is incorrect', 401));
  }

  user.password = req.body.newPassword;

  await user.save();

  sendToken(user, 200, res);
});

// @desc    Update current user data
// @route   PUT /api/v1/me/update
// @access  PRIVATE
export const updateMe = asyncHandler(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
  };

  const user = await User.findByIdAndUpdate(req.user._id, newUserData, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  return res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Show all jobs applied by current user
// @route   GET /api/v1/jobs/applied
// @access  PRIVATE
export const getAppliedJobs = asyncHandler(async (req, res, next) => {
  const jobs = await Job.find({ 'applicantsApplied.id': req.user._id });

  res.status(200).json({
    success: true,
    results: jobs.length,
    data: jobs,
  });
});

// @desc    Show all jobs created by current employeer
// @route   GET /api/v1/jobs/published
// @access  PRIVATE
export const getPublishedJobs = asyncHandler(async (req, res, next) => {
  const jobs = await Job.find({ user: req.user._id });

  res.status(200).json({
    success: true,
    results: jobs.length,
    data: jobs,
  });
});

// @desc    Delete Current User
// @route   PUT /api/v1/me/delete
// @access  PRIVATE
export const deleteMe = asyncHandler(async (req, res, next) => {
  deleteUserData(req.user._id, req.user.role);

  const user = await User.findByIdAndDelete(req.user._id);

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  res.cookie('token', 'none', {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  return res.status(200).json({
    success: true,
    message: 'Your account has been deleted',
  });
});

// @desc    Delete Current User
// @route   PUT /api/v1/user/:id
// @access  ADMIN
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  deleteUserData(user._id, user.role);

  await user.remove();

  return res.status(200).json({
    success: true,
    message: 'Account has been deleted',
  });
});

async function deleteUserData(userId, role) {
  if (role === 'employeer') {
    await Job.deleteMany({ user: userId });
  }

  if (role === 'user') {
    const appliedJobs = await Job.find({
      'applicantsApplied.id': userId,
    }).select('+applicantsApplied');

    for (let i = 0; i < appliedJobs.length; i++) {
      let obj = appliedJobs[i].applicantsApplied.find(
        (o) => o.id.toString() === userId.toString()
      );

      const filepath = path.join(
        __dirname,
        process.env.FILE_UPLOAD_PATH,
        obj.resume
      );

      fs.unlink(filepath, (err) => {
        if (err) return console.log(err);
      });

      appliedJobs[i].applicantsApplied.splice(
        appliedJobs[i].applicantsApplied.indexOf(obj.id)
      );

      await appliedJobs[i].save();
    }
  }
}
