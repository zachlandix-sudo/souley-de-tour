const AppError = require('../utils/AppError');

const notFound = (req, _res, next) => next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message;
  let details = err.details;

  if (err.name === 'ValidationError') {
    status = 422;
    message = 'Validation failed.';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `Duplicate value for ${field}.`;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}.`;
  }

  if (status >= 500 && !err.isOperational) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Server error.';
  }

  const body = { success: false, message };
  if (details) body.errors = details;
  if (process.env.NODE_ENV !== 'production' && status >= 500) body.stack = err.stack;
  res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
