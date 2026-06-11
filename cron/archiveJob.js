const cron = require('node-cron');
const archiveOldMessages = require('../services/archiveMessages');
const moveWarmToCold = require('../services/coldArchiveMessages');
const logger = require('../utils/logger');

// Tier 1: daily move from Messages (hot) -> ArchivedMessages (warm)
const DAILY_CRON = '0 2 * * *'; // 02:00 every day

// Tier 2: weekly move from ArchivedMessages (warm) -> ColdMessages (cold)
const WEEKLY_COLD_CRON = '0 3 * * 0'; // 03:00 every Sunday

cron.schedule(DAILY_CRON, async () => {
  logger.info('archive cron (warm): triggered');
  try {
    await archiveOldMessages();
  } catch (err) {
    logger.error(`archive cron (warm) failed: ${err.message}`);
  }
});

cron.schedule(WEEKLY_COLD_CRON, async () => {
  logger.info('archive cron (cold): triggered');
  try {
    await moveWarmToCold();
  } catch (err) {
    logger.error(`archive cron (cold) failed: ${err.message}`);
  }
});

logger.info(`archive cron scheduled — warm: "${DAILY_CRON}", cold: "${WEEKLY_COLD_CRON}"`);
