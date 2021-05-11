import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import db from './config/db.js';
import morgan from 'morgan';
import colors from 'colors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/errors.js';
import ErrorHandler from './utils/errorHandler.js';
import fileupload from 'express-fileupload';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xssClean from 'xss-clean';
import hpp from 'hpp';
import bodyParser from 'body-parser';

const __dirname = path.resolve();

// Routes Files
import jobRoutes from './routes/jobs.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';

// Environment variables
dotenv.config({ path: './config/config.env' });

// Handling Uncaught exceptions
process.on('uncaughtException', function (err) {
  console.log(`Error: ${err.message}`.bold.red);
  process.exit(1);
});

// Connect To DB
db();

const app = express();

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.json());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(fileupload());

// Api Rate Limit
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Enable cors
app.use(cors());

// Setting various http security headers
app.use(helmet());

// Prevent NoSql Injections
app.use(mongoSanitize());

// Prevent Xss attacks
app.use(xssClean());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ['positions'],
  })
);

// Mount Routers
app.use('/api/v1', jobRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1', userRoutes);

// Route Not Found
app.all('*', (req, res, next) => {
  next(new ErrorHandler(`Route: ${req.originalUrl} not found`, 404));
});

// Middleware to handle error
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `Server is running on Port: ${PORT} in ${process.env.NODE_ENV} mode`.yellow
      .bold
  );
});

// Handling unhandledRejection
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red.bold);
  server.close(() => process.exit(1));
});
