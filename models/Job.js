import mongoose from 'mongoose';
import validator from 'validator';
import slugify from 'slugify';
import geocoder from '../utils/geocoder.js';

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please enter job title.'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters.'],
  },
  slug: String,
  description: {
    type: String,
    required: [true, 'Please enter job description.'],
    maxlength: [1000, 'Job description cannot exceed 1000 characters.'],
  },
  email: {
    type: String,
    validate: [validator.isEmail, 'Please enter valid email address.'],
  },
  address: {
    type: String,
    required: [true, 'Please enter an address.'],
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
    },
    formattedAddress: String,
    city: String,
    state: String,
    zipcode: String,
    country: String,
  },
  company: {
    type: String,
    required: [true, 'Please enter company name.'],
  },
  industry: {
    type: [String],
    required: [true, 'Please enter industry for the job.'],
    enum: {
      values: [
        'Business',
        'Information Technology',
        'Banking',
        'Education/Training',
        'Telecommunication',
        'Others',
      ],
      message: 'Please select correct option for industry.',
    },
  },
  jobType: {
    type: String,
    required: [true, 'Please enter job type.'],
    enum: {
      values: ['Permanent', 'Temporary', 'Internship'],
      message: 'Please select correct option for job type.',
    },
  },
  minEducation: {
    type: String,
    required: [true, 'Please enter minimum education for the job.'],
    enum: {
      values: ['Bachelors', 'Masters', 'Phd'],
      message: 'Please select correct option for Education',
    },
  },
  positions: {
    type: Number,
    default: 1,
  },
  experience: {
    type: String,
    required: [true, 'Please enter experience required for the job'],
    enum: {
      values: [
        'No Experience',
        '1 Year - 2 Years',
        '2 Years - 5 Years',
        '5 Years+',
      ],
      message: 'Please select correct option for experience.',
    },
  },
  salary: {
    type: Number,
    required: [true, 'Please enter expected salart for this job.'],
  },
  postingDate: {
    type: Date,
    default: Date.now,
  },
  lastDate: {
    type: Date,
    default: new Date(+new Date() + 1000 * 60 * 60 * 24 * 7),
  },
  applicantsApplied: {
    type: [Object],
    select: false,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

JobSchema.pre('save', function (next) {
  this.slug = slugify(this.title, {
    replacement: '-',
    lower: true,
  });
  next();
});

JobSchema.pre('save', async function (next) {
  const res = await geocoder.geocode(this.address);
  this.location = {
    type: 'Point',
    coordinates: [res[0].longitude, res[0].latitude],
    formattedAddress: res[0].formattedAddress,
    city: res[0].city,
    country: res[0].countryCode,
    state: res[0].stateCode,
    zipcode: res[0].zipcode,
  };
  next();
});

const Job = mongoose.model('Job', JobSchema);

export default Job;
