// Hot -> Warm: moves Messages older than ARCHIVE_AGE_DAYS into ArchivedMessages.
// Shard-aware: runs the move on every shard's connection independently.

const { Op } = require('sequelize');
const { allMessageShards } = require('../models');
const logger = require('../utils/logger');

const ARCHIVE_AGE_DAYS = 1;

async function archiveOnShard(shard, cutoff) {
  const t = await shard.sequelize.transaction();
  try {
    const oldMessages = await shard.Message.findAll({
      where: { createdAt: { [Op.lt]: cutoff } },
      transaction: t,
    });

    if (oldMessages.length === 0) {
      await t.commit();
      return 0;
    }

    const archivedData = oldMessages.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.userName,
      groupId: m.groupId,
      message: m.message,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileMimeType: m.fileMimeType,
      fileSize: m.fileSize,
      createdAt: m.createdAt,
    }));

    await shard.ArchivedMessage.bulkCreate(archivedData, { transaction: t });
    await shard.Message.destroy({
      where: { createdAt: { [Op.lt]: cutoff } },
      transaction: t,
    });

    await t.commit();
    return archivedData.length;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function archiveOldMessages() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ARCHIVE_AGE_DAYS);

  const shards = allMessageShards();
  let total = 0;
  for (let i = 0; i < shards.length; i++) {
    try {
      const moved = await archiveOnShard(shards[i], cutoff);
      total += moved;
      if (moved > 0) logger.info(`archive (warm) shard ${i}: moved ${moved} rows`);
    } catch (err) {
      logger.error(`archive (warm) shard ${i} failed: ${err.message}`);
    }
  }
  if (total === 0) logger.info('archive (warm): no rows to move');
  return { archived: total };
}

module.exports = archiveOldMessages;
