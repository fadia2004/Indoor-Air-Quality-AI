const { predictQuickScan } = require('../services/quickScanService');

function predict(req, res, next) {
  try {
    const result = predictQuickScan(req.body || {});
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { predict };
