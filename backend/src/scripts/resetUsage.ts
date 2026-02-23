/**
 * Monthly usage reset cron
 * Run this via cron on the 1st of each month:
 * 0 0 1 * * node dist/scripts/resetUsage.js
 * Or use a cron service like Render Cron Jobs, Railway Cron, etc.
 */
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

async function resetMonthlyUsage() {
  logger.info('Starting monthly usage reset...');

  const result = await prisma.organization.updateMany({
    data: {
      messageCount: 0,
      conversationCount: 0,
    },
  });

  logger.info(`Reset usage for ${result.count} organizations`);

  // Archive old usage logs older than 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const archived = await prisma.usageLog.deleteMany({
    where: {
      createdAt: { lt: sixMonthsAgo },
    },
  });

  logger.info(`Archived ${archived.count} old usage log entries`);
  await prisma.$disconnect();
  logger.info('Monthly reset complete');
}

resetMonthlyUsage().catch((err) => {
  logger.error('Monthly reset failed', { error: err.message });
  process.exit(1);
});
