import express from 'express';
import {
  getJobs,
  getJobsInRadius,
  newJob,
  updateJob,
  deleteJob,
  getJob,
  getJobStats,
  applyToJob,
} from '../controllers/jobs.js';
import { authorize, protect } from '../middlewares/auth.js';

const router = express.Router();

router.route('/jobs').get(getJobs);
router.route('/job/:id/:slug').get(getJob);
router.route('/stats/:topic').get(getJobStats);
router.route('/job/new').post(protect, authorize('employeer', 'admin'), newJob);
router.route('/jobs/:zipcode/:distance').get(getJobsInRadius);
router
  .route('/job/:id')
  .put(protect, authorize('employeer', 'admin'), updateJob)
  .delete(protect, authorize('employeer', 'admin'), deleteJob);
router.route('/job/:id/apply').put(protect, authorize('user'), applyToJob);

export default router;
