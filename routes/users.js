import express from 'express';
import {
  deleteMe,
  getAppliedJobs,
  getMe,
  updateMe,
  updatePassword,
  getPublishedJobs,
  getAllUsers,
  deleteUser,
} from '../controllers/users.js';
import { authorize, protect } from '../middlewares/auth.js';
const router = express.Router();

router.route('/user/:id').delete(protect, authorize('admin'), deleteUser);
router.route('/users').get(protect, authorize('admin'), getAllUsers);
router.route('/me').get(protect, getMe);
router.route('/me/update').put(protect, updateMe);
router.route('/me/delete').delete(protect, deleteMe);
router.route('/password/update').put(protect, updatePassword);
router.route('/jobs/applied').get(protect, authorize('user'), getAppliedJobs);
router
  .route('/jobs/published')
  .get(protect, authorize('employeer', 'admin'), getPublishedJobs);

export default router;
