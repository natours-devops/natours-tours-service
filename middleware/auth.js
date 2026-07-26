const AppError = require('../utils/appError');

// API Gateway validates the JWT and injects these headers.
// Services trust them because they are only reachable internally.
exports.protect = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  if (!userId) return next(new AppError('You are not logged in! Please log in.', 401));
  req.user = { id: userId, role: userRole };
  next();
};

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return next(new AppError('You do not have permission to perform this action', 403));
  next();
};
