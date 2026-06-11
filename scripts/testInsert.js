// Manual seed script: inserts a 2-day-old test message so you can verify
// the archive cron job works end-to-end.
// Run from project root:  node scripts/testInsert.js

const { Message, sequelize } = require('../models');
const logger = require('../utils/logger');

async function insertOldMessage() {
  try {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 2);

    const inserted = await Message.create({
      userId: 1,
      userName: 'jatin',
      groupId: 1,
      message: 'This is a 2-day old test message',
      fileUrl: null,
      createdAt: oldDate,
    });

    logger.info(`Inserted test message id=${inserted.id} createdAt=${inserted.createdAt.toISOString()}`);
  } catch (err) {
    logger.error(`Insert failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

insertOldMessage();
