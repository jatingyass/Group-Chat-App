// Models registry — shard-aware.
//
// Layout when SHARD_COUNT=1 (default): every table is on the single metaDb
// instance, and there is exactly one connection pool — identical to the
// non-sharded baseline.
//
// Layout when SHARD_COUNT>=2:
//   • metaDb         : Users, Groups, GroupMembers
//   • shards[i]      : Messages, ArchivedMessages, ColdMessages
//
// Cross-shard joins are NOT possible (different DBs), so we deliberately
// denormalize `userName` onto Message and avoid Sequelize `include` for
// User -> Message. Group -> Message also has no association.

const Sequelize = require('sequelize');
const { metaDb, shards, shardCount, getShardIndex } = require('../config/shards');

// ---------- Meta models (single connection) ----------
const User = require('./User')(metaDb, Sequelize.DataTypes);
const Group = require('./Group')(metaDb, Sequelize.DataTypes);
const GroupMember = require('./GroupMember')(metaDb, Sequelize.DataTypes);

User.belongsToMany(Group, { through: GroupMember, foreignKey: 'userId' });
Group.belongsToMany(User, { through: GroupMember, foreignKey: 'groupId' });
Group.hasMany(GroupMember, { foreignKey: 'groupId', onDelete: 'CASCADE' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId' });
User.hasMany(GroupMember, { foreignKey: 'userId', onDelete: 'CASCADE' });
GroupMember.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(GroupMember, { foreignKey: 'added_by', as: 'AddedMembers' });
GroupMember.belongsTo(User, { foreignKey: 'added_by', as: 'AddedBy' });

// ---------- Message models (one set per shard) ----------
const messageShards = shards.map((s) => ({
  sequelize: s,
  Message: require('./Message')(s, Sequelize.DataTypes),
  ArchivedMessage: require('./ArchivedMessage')(s, Sequelize.DataTypes),
  ColdMessage: require('./ColdMessage')(s, Sequelize.DataTypes),
}));

// ---------- Sharded accessors ----------
const getMessageShard = (groupId) => messageShards[getShardIndex(groupId)];
const getMessage = (groupId) => getMessageShard(groupId).Message;
const getArchivedMessage = (groupId) => getMessageShard(groupId).ArchivedMessage;
const getColdMessage = (groupId) => getMessageShard(groupId).ColdMessage;
const getMessageSequelize = (groupId) => getMessageShard(groupId).sequelize;
const allMessageShards = () => messageShards;

// ---------- syncAll: dev convenience ----------
const syncAll = async (options) => {
  await metaDb.sync(options);
  const synced = new Set([metaDb]);
  for (const s of shards) {
    if (!synced.has(s)) {
      await s.sync(options);
      synced.add(s);
    }
  }
};

// ---------- Legacy aliases (point at shard 0 — fine for SHARD_COUNT=1) ----------
const Message = messageShards[0].Message;
const ArchivedMessage = messageShards[0].ArchivedMessage;
const ColdMessage = messageShards[0].ColdMessage;

module.exports = {
  // connections
  sequelize: metaDb,
  metaDb,
  shards,
  shardCount,
  syncAll,
  // meta models
  User,
  Group,
  GroupMember,
  // legacy direct models (work for SHARD_COUNT=1; for SHARD_COUNT>=2 callers should use the accessors)
  Message,
  ArchivedMessage,
  ColdMessage,
  // sharded accessors
  getMessage,
  getArchivedMessage,
  getColdMessage,
  getMessageSequelize,
  allMessageShards,
};
