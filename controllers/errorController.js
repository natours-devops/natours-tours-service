const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => new AppError(`Invalid ${err.path}: ${err.value}.`, 400);
const handleDuplicateFieldsDB = (err) => new AppError(`Duplicate field value "${err.keyValue.name}" please use another value`, 400);
const handleValidationErrorDB = (err) => new AppError(`Invalid input data. ${Object.values(err.errors).map((el) => el.message).join('. ')}`, 400);
const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);
const handleJWTExpireError = () => new AppError('Your token has expired. Please log in again.', 401);

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({ status: err.status, error: err, message: err.message, stack: err.stack });
  }

  let error = { ...err, name: err.name, message: err.message };
  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpireError();

  if (error.isOperational)
    return res.status(error.statusCode).json({ status: error.status, message: error.message });

  console.error('ERROR', error);
  res.status(500).json({ status: 'error', message: 'Something went wrong' });
};
