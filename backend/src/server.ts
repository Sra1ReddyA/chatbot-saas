import app from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initPlanPriceMap } from './services/stripeService';
import { logger } from './utils/logger';

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize Stripe plan-price mapping
    initPlanPriceMap();

    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 Server running on port ${config.PORT}`, {
        environment: config.NODE_ENV,
        port: config.PORT,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        logger.info('Graceful shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();
