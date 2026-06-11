// Warm -> Cold: moves ArchivedMessages older than COLD_AGE_DAYS into ColdMessages.
// Shard-aware: runs per shard.

const { Op } = require('sequelize');
const { allMessageShards } = require('../models');
const logger = require('../utils/logger');

const COLD_AGE_DAYS = 30;

async function freezeOnShard(shard, cutoff) {
  const t = await shard.sequelize.transaction();
  try {
    const candidates = await shard.ArchivedMessage.findAll({
      where: { createdAt: { [Op.lt]: cutoff } },
      transaction: t,
    });

    if (candidates.length === 0) {
      await t.commit();
      return 0;
    }

    const now = new Date();
    const rows = candidates.map((m) => ({
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
      archivedAt: now,
    }));

    await shard.ColdMessage.bulkCreate(rows, { transaction: t });
    await shard.ArchivedMessage.destroy({
      where: { createdAt: { [Op.lt]: cutoff } },
      transaction: t,
    });

    await t.commit();
    return rows.length;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function moveWarmToCold() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - COLD_AGE_DAYS);

  const shards = allMessageShards();
  let total = 0;
  for (let i = 0; i < shards.length; i++) {
    try {
      const frozen = await freezeOnShard(shards[i], cutoff);
      total += frozen;
      if (frozen > 0) logger.info(`archive (cold) shard ${i}: froze ${frozen} rows`);
    } catch (err) {
      logger.error(`archive (cold) shard ${i} failed: ${err.message}`);
    }
  }
  if (total === 0) logger.info('archive (cold): no rows to freeze');
  return { frozen: total };
}

module.exports = moveWarmToCold;
