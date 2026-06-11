const dotenv = require('dotenv');
const path = require('path');
const { z } = require('zod');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),

  // Sharding for the message tables (Messages, ArchivedMessages, ColdMessages).
  //   SHARD_COUNT=1 (default)    -> single-DB mode, identical to non-sharded behavior.
  //   SHARD_COUNT>=2             -> SHARD_DBS must list exactly that many database names,
  //                                 and each must already exist on the configured DB host.
  // Routing is `groupId % SHARD_COUNT` (consistent — same group always hits same shard).
  SHARD_COUNT: z.coerce.number().int().positive().default(1),
  SHARD_DBS: z.string().optional(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_UPLOAD_PATH: z.string().default('./uploads'),

  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_BUCKET_NAME: z.string().optional(),
  AWS_S3_ENDPOINT: z.string().optional(),
  AWS_S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),

  REDIS_URL: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

if (env.STORAGE_DRIVER === 's3') {
  const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_BUCKET_NAME'];
  const missing = required.filter((k) => !env[k]);
  if (missing.length) {
    console.error(`STORAGE_DRIVER=s3 requires: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Validate the shard config now that everything else is parsed.
const shardDbs = env.SHARD_DBS
  ? env.SHARD_DBS.split(',').map((s) => s.trim()).filter(Boolean)
  : [env.DB_NAME];

if (shardDbs.length !== env.SHARD_COUNT) {
  console.error(
    `SHARD_DBS must list exactly SHARD_COUNT (${env.SHARD_COUNT}) database names; got ${shardDbs.length} (${shardDbs.join(',')})`,
  );
  process.exit(1);
}

env.SHARD_DBS_LIST = shardDbs;

module.exports = env;
