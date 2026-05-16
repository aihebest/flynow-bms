const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  logger.error({
    message,
    status,
    path: req.path,
    method: req.method,
    user: req.user?.email,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
