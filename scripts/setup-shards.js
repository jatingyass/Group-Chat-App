// Creates the meta database + each shard database listed in SHARD_DBS.
// Idempotent (CREATE DATABASE IF NOT EXISTS).
//
// Run from project root:
//   node scripts/setup-shards.js
//
// Useful when SHARD_COUNT >= 2 and you've added new shard names to SHARD_DBS.

const mysql = require('mysql2/promise');
const env = require('../config/env');

async function main() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: false,
  });

  const dbs = new Set([env.DB_NAME, ...env.SHARD_DBS_LIST]);
  for (const db of dbs) {
    const sql = `CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
    await conn.query(sql);
    console.log(`✓ ensured database: ${db}`);
  }

  await conn.end();
  console.log('\nDone. Restart the server so Sequelize syncs the schema.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
