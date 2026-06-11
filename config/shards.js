// Shard manager for the messages workload.
//
// The application uses two kinds of databases:
//   • metaDb   — single database holding Users, Groups, GroupMembers (small,
//                relational, frequently joined).
//   • shards[] — one or more databases holding Messages, ArchivedMessages,
//                ColdMessages (large, write-heavy, never joined cross-group).
//
// When SHARD_COUNT=1 (default), shards[0] reuses the metaDb connection so
// every table lives in DB_NAME and there is exactly one connection pool,
// identical to the non-sharded baseline. When SHARD_COUNT>=2, each shard is
// a dedicated database (you provide their names via SHARD_DBS).
//
// Routing rule: shardIndex = groupId % SHARD_COUNT
// This is **consistent** — a given group always lands on the same shard, so
// per-group queries hit one shard and a transaction on that shard is enough.

const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('../utils/logger');

const sequelizeOptions = (database) => ({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  dialect: 'mysql',
  logging: env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  define: { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
});

const buildSequelize = (database) => {
  const o = sequelizeOptions(database);
  return new Sequelize(o.database, o.username, o.password, o);
};

// metaDb is always on DB_NAME
const metaDb = buildSequelize(env.DB_NAME);

// Build per-shard connections. To avoid duplicate pools when a shard reuses
// DB_NAME (the SHARD_COUNT=1 case), we map the same database name -> same instance.
const dbToInstance = new Map();
dbToInstance.set(env.DB_NAME, metaDb);

const shards = env.SHARD_DBS_LIST.map((dbName) => {
  if (!dbToInstance.has(dbName)) {
    dbToInstance.set(dbName, buildSequelize(dbName));
  }
  return dbToInstance.get(dbName);
});

const getShardForGroup = (groupId) => {
  const idx = Number(groupId) % env.SHARD_COUNT;
  return shards[((idx % env.SHARD_COUNT) + env.SHARD_COUNT) % env.SHARD_COUNT];
};

const getShardIndex = (groupId) =>
  ((Number(groupId) % env.SHARD_COUNT) + env.SHARD_COUNT) % env.SHARD_COUNT;

// All distinct Sequelize instances (used for connect/sync/close)
const allConnections = () => Array.from(new Set([metaDb, ...shards]));

const connectAll = async () => {
  const all = allConnections();
  await Promise.all(all.map((s) => s.authenticate()));
  logger.info(
    `db: meta=${env.DB_NAME} shards=[${env.SHARD_DBS_LIST.join(',')}] (${env.SHARD_COUNT} shard${env.SHARD_COUNT > 1 ? 's' : ''})`,
  );
};

const closeAll = async () => {
  await Promise.all(allConnections().map((s) => s.close()));
};

module.exports = {
  metaDb,
  shards,
  shardCount: env.SHARD_COUNT,
  getShardForGroup,
  getShardIndex,
  allConnections,
  connectAll,
  closeAll,
};
