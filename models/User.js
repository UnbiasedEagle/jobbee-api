import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter name.'],
    },
    email: {
      type: String,
      required: [true, 'Please enter email.'],
      unique: true,
      validate: [validator.isEmail, 'Please enter valid email.'],
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'employeer'],
        message: 'Please select correct role',
      },
      default: 'user',
    },
    password: {
      type: String,
      required: [true, 'Please enter password.'],
      minlength: [8, 'Password must be 8 characters long.'],
      select: false,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Encrypt password before saving the user in database
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.generateAuthToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_TIME,
  });
};

UserSchema.methods.checkPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Generate Reset Password Token
UserSchema.methods.generateResetPasswordToken = function () {
  const token = crypto.randomBytes(20).toString('hex');

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  this.resetPasswordToken = hashedToken;

  this.resetPasswordExpire = Date.now() + 1000 * 60 * 30;

  return token;
};

UserSchema.virtual('jobsPosted', {
  ref: 'Job',
  localField: '_id',
  foreignField: 'user',
  justOne: false,
});

const User = mongoose.model('User', UserSchema);

export default User;
