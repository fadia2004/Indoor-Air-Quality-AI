function notFound(req, res, next) {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status === 500) {
    console.error(err);
  }
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error'
  });
}

module.exports = { notFound, errorHandler };
