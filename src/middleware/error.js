const CustomError = require('../utils/CustomError');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message;

  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  // Mongoose bad ObjectId
  if (err.name === 'CastError')
    error = new CustomError(`Resource not found`, 404);

  // Mongoose duplicate key
  if (err.code === 11000)
    error = new CustomError(`Duplicate field value entered`, 400);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new CustomError(message, 400);
  }

  res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
  });
};

module.exports = errorHandler;
