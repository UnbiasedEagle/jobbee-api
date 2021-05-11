import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import ErrorHandler from '../utils/errorHandler.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ErrorHandler('Login first to access this resource', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    req.user = user;

    next();
  } catch (err) {
    return next(new ErrorHandler('No authorization, token failed', 401));
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      return next(
        new ErrorHandler(
          `Role: ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
  };
};
