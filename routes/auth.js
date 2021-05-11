import express from 'express';
import {
  forgotPassword,
  login,
  register,
  resetPassword,
  logout,
} from '../controllers/auth.js';
import { protect } from '../middlewares/auth.js';
const router = express.Router();

router.route('/register').post(register);
router.route('/login').post(login);
router.route('/password/forgot').post(forgotPassword);
router.route('/password/reset/:token').post(resetPassword);
router.route('/logout').get(protect, logout);

export default router;
