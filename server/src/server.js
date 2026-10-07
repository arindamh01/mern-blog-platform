const http = require('http');
const env = require('./config/env');
const createApp = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { initSocket } = require('./sockets');
const logger = require('./utils/logger');

async function start() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => logger.info(`API listening on ${env.SERVER_URL} (${env.NODE_ENV})`));

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
