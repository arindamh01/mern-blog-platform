const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

async function connectDB(uri = env.MONGO_URI) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
