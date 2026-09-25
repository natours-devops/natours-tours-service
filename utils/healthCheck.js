const mongoose = require('mongoose');

module.exports = (serviceName) => async (req, res) => {
  const health = {
    status: 'UP',
    service: serviceName,
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    health.checks.database = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
    if (health.checks.database === 'DOWN') health.status = 'DOWN';
  } catch (err) {
    health.checks.database = 'DOWN';
    health.status = 'DOWN';
  }

  res.status(health.status === 'UP' ? 200 : 503).json(health);
};
