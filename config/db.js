// Backward-compatible shim: previous code imported `{ sequelize, connect }`
// from `./config/db`. The real implementation now lives in `./config/shards`.
const { metaDb, connectAll } = require('./shards');

module.exports = {
  sequelize: metaDb,
  connect: connectAll,
};
