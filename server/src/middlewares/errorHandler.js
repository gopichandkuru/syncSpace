const AppError = require('../utils/AppError');

const notFound = (req, _res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'CastError') { statusCode = 400; message = `Invalid ${err.path}: ${err.value}`; }
  if (err.code === 11000) { statusCode = 409; message = `Duplicate field: ${Object.keys(err.keyValue).join(', ')}`; }
  if (err.name === 'ValidationError') { statusCode = 422; message = Object.values(err.errors).map((e) => e.message).join('; '); }
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token expired'; }

  if (process.env.NODE_ENV === 'development') {
    console.error('❌', err);
    return res.status(statusCode).json({ success: false, message, stack: err.stack });
  }

  res.status(statusCode).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
