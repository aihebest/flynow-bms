require('dotenv').config();
require('express-async-errors');

const app  = require('./src/app');
const { connectDB } = require('./src/config/database');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    logger.info('Database connection established');

    app.listen(PORT, () => {
      logger.info(`FlyNow BMS API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
