import Job from '../models/Job.js';
import ErrorHandler from '../utils/errorHandler.js';
import geocoder from '../utils/geocoder.js';
import asyncHandler from 'express-async-handler';
import ApiFilters from '../utils/apiFilters.js';
import path from 'path';
import fs from 'fs';

const __dirname = path.resolve();

// @desc    Get all jobs
// @route   GET /api/v1/jobs
// @access  PUBLIC
export const getJobs = asyncHandler(async (req, res, next) => {
  const apiFilters = new ApiFilters(Job.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .searchByQuery()
    .paginate();
  const jobs = await apiFilters.query;
  return res.status(201).json({
    success: true,
    results: jobs.length,
    data: jobs,
  });
});

// @desc    Get single job
// @route   GET /api/v1/job/:id/:slug
// @access  PUBLIC
export const getJob = asyncHandler(async (req, res, next) => {
  const job = await Job.find({
    _id: req.params.id,
    slug: req.params.slug,
  }).populate('user', 'name');

  if (!job || job.length === 0) {
    return next(new ErrorHandler('Job not found', 404));
  }

  return res.status(201).json({
    success: true,
    data: job,
  });
});

// @desc    Create new job
// @route   POST /api/v1/job/new
// @access  PRIVATE
export const newJob = asyncHandler(async (req, res, next) => {
  req.body.user = req.user._id;

  const job = await Job.create(req.body);

  return res.status(201).json({
    success: true,
    data: job,
  });
});

// @desc    Update Job
// @route   PUT /api/v1/job/:id
// @access  PRIVATE
export const updateJob = asyncHandler(async (req, res, next) => {
  let job = await Job.findById(req.params.id);

  if (!job) {
    return next(new ErrorHandler('Job not found', 404));
  }

  if (
    job.user.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(
      new ErrorHandler(
        `User: ${req.user._id} is not allowed to update this job`,
        401
      )
    );
  }

  job = await Job.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  return res.status(200).json({
    success: true,
    data: job,
  });
});

// @desc    Delete Job
// @route   DELETE /api/v1/job/:id
// @access  PRIVATE
export const deleteJob = asyncHandler(async (req, res, next) => {
  const job = await Job.findById(req.params.id).select('+applicantsApplied');

  if (!job) {
    return next(new ErrorHandler('Job not found', 404));
  }

  if (
    job.user.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(
      new ErrorHandler(
        `User: ${req.user._id} is not allowed to update this job`,
        401
      )
    );
  }

  for (let i = 0; i < job.applicantsApplied.length; i++) {
    const obj = job.applicantsApplied[i];

    const filepath = path.join(
      __dirname,
      process.env.FILE_UPLOAD_PATH,
      obj.resume
    );

    fs.unlink(filepath, (err) => {
      if (err) return console.log(err);
    });
  }

  await Job.findByIdAndDelete(req.params.id);

  return res.status(200).json({
    success: true,
    message: 'Job removed',
  });
});

// @desc    Search job within radius
// @route   GET /api/v1/jobs/:zipcode/:distance
// @access  PUBLIC
export const getJobsInRadius = asyncHandler(async (req, res, next) => {
  const zipcode = req.params.zipcode;
  const distance = req.params.distance;

  const loc = await geocoder.geocode(zipcode);

  const lat = loc[0].latitude;
  const lng = loc[0].longitude;

  const radius = distance / 3963;

  const jobs = await Job.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    success: true,
    count: jobs.length,
    data: jobs,
  });
});

// @desc    Get stats about a topic(job)
// @route   GET /api/v1/stats/:topic
// @access  PUBLIC
export const getJobStats = asyncHandler(async (req, res, next) => {
  const stats = await Job.aggregate([
    { $match: { title: { $regex: req.params.topic, $options: 'i' } } },
    {
      $group: {
        _id: '$experience',
        totalJobs: { $sum: 1 },
        avgSalary: { $avg: '$salary' },
        avgPositions: { $avg: '$positions' },
        minSalary: { $min: '$salary' },
        maxSalary: { $max: '$salary' },
      },
    },
  ]);

  if (stats.length === 0) {
    return next(
      new ErrorHandler(`No stats found for ${req.params.topic}`, 200)
    );
  }

  return res.status(200).json({
    success: true,
    data: stats,
  });
});

// @desc    Apply to job using resume
// @route   PUT /api/v1/job/:id//apply
// @access  PRIVATE
export const applyToJob = asyncHandler(async (req, res, next) => {
  let job = await Job.findById(req.params.id).select('+applicantsApplied');

  if (!job) {
    return next(new ErrorHandler('Job not found', 404));
  }

  if (job.lastDate < new Date(Date.now())) {
    return next(
      new ErrorHandler(
        'You cannot apply to this job, Last date has expired',
        400
      )
    );
  }

  const hasAlreadyApplied = job.applicantsApplied.find(
    (applicant) => applicant.id.toString() === req.user._id.toString()
  );

  if (hasAlreadyApplied) {
    return next(new ErrorHandler('You have already applied to this job', 400));
  }

  // Check the files
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler('Please upload a file', 400));
  }

  const file = req.files.file;
  const extName = path.extname(file.name);

  const fileList = ['.pdf', '.docx'];

  if (!fileList.includes(extName)) {
    return next(new ErrorHandler('Please upload document file', 400));
  }

  if (file.size > process.env.MAX_FILE_SIZE) {
    return next(new ErrorHandler('Please upload file less than 2mb', 403));
  }

  // Rename the resume
  file.name = `${req.user._id}_${req.user.name}_${job._id}${extName}`;

  const uploadDir = path.join(`${process.env.FILE_UPLOAD_PATH}`, file.name);

  file.mv(uploadDir, async (err) => {
    if (err) {
      console.log(err.message);
      return next(new ErrorHandler('Resume Upload Failed', 500));
    }

    await Job.findByIdAndUpdate(
      req.params.id,
      {
        $push: { applicantsApplied: { id: req.user._id, resume: file.name } },
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Applied to Job successfully',
      data: file.name,
    });
  });
});
