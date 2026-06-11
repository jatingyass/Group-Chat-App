const http = require('http');
const env = require('./config/env');
const logger = require('./utils/logger');
const app = require('./app');
const { connectAll, closeAll } = require('./config/shards');
const { syncAll } = require('./models');
const { initSocket } = require('./services/socketService');

let server;

const startServer = async () => {
  try {
    await connectAll();
    await syncAll({ alter: env.NODE_ENV === 'development' });
    logger.info('Database schema synced (meta + all shards)');

    server = http.createServer(app);
    await initSocket(server);

    require('./cron/archiveJob'); // eslint-disable-line global-require

    server.listen(env.PORT, () => {
      logger.info(`Server listening on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    logger.error(`Server startup failed: ${err.stack || err.message}`);
    process.exit(1);
  }
};

const shutdown = (signal) => async () => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      try {
        await closeAll();
      } catch (err) {
        logger.error(`Error closing DB connections: ${err.message}`);
      }
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('Force exit after 10s');
      process.exit(1);
    }, 10_000).unref();
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason?.stack || reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.stack}`);
  process.exit(1);
});

startServer();
