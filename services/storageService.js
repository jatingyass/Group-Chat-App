// Storage abstraction with two drivers selected by env.STORAGE_DRIVER:
//   - "local" : writes to disk under env.LOCAL_UPLOAD_PATH and serves via /uploads
//   - "s3"    : returns S3 / S3-compatible (MinIO) presigned PUT URLs
//
// Both drivers expose the same API:
//   getUploadUrl({ filename, filetype, filesize })  ->  { url, fileUrl, key, method, maxBytes }

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const env = require('../config/env');

// Per-category byte limits. Wider than v1 — we now support video and common docs.
const MIME_LIMITS = {
  // images
  'image/jpeg': 10 * 1024 * 1024,
  'image/png': 10 * 1024 * 1024,
  'image/gif': 10 * 1024 * 1024,
  'image/webp': 10 * 1024 * 1024,
  // video
  'video/mp4': 100 * 1024 * 1024,
  'video/webm': 100 * 1024 * 1024,
  'video/quicktime': 100 * 1024 * 1024,
  // audio
  'audio/mpeg': 25 * 1024 * 1024,
  'audio/wav': 25 * 1024 * 1024,
  'audio/webm': 25 * 1024 * 1024,
  // documents
  'application/pdf': 25 * 1024 * 1024,
  'text/plain': 5 * 1024 * 1024,
  'application/msword': 25 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 25 * 1024 * 1024,
  'application/vnd.ms-excel': 25 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 25 * 1024 * 1024,
  'application/zip': 50 * 1024 * 1024,
};

const ABSOLUTE_MAX_BYTES = 100 * 1024 * 1024;

const sanitizeFilename = (name) =>
  name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .slice(-150);

const buildKey = (filename) => {
  const safe = sanitizeFilename(filename);
  const stamp = Date.now();
  const rand = crypto.randomBytes(6).toString('hex');
  return `uploads/${stamp}_${rand}_${safe}`;
};

const enforceMimeAndSize = ({ filetype, filesize }) => {
  const limit = MIME_LIMITS[filetype];
  if (!limit) {
    const err = new Error(`Filetype "${filetype}" is not allowed`);
    err.statusCode = 400;
    throw err;
  }
  if (typeof filesize === 'number' && filesize > limit) {
    const err = new Error(
      `File too large for ${filetype} — limit ${(limit / 1024 / 1024).toFixed(0)} MB`,
    );
    err.statusCode = 413;
    throw err;
  }
  return limit;
};

// --------------------------------- LOCAL ---------------------------------
const ensureLocalDir = () => {
  const dir = path.resolve(env.LOCAL_UPLOAD_PATH);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const localDriver = {
  async getUploadUrl({ filename, filetype, filesize }) {
    const maxBytes = enforceMimeAndSize({ filetype, filesize });
    ensureLocalDir();
    const key = buildKey(filename);
    const backendUrl = `/api/files/upload?key=${encodeURIComponent(key)}`;
    const fileUrl = `/uploads/${path.basename(key)}`;
    return { url: backendUrl, fileUrl, key, method: 'PUT', maxBytes };
  },
  async writeBuffer(key, buffer) {
    const filename = path.basename(key);
    const dir = ensureLocalDir();
    const full = path.join(dir, filename);
    await fs.promises.writeFile(full, buffer);
    return `/uploads/${filename}`;
  },
};

// ----------------------------------- S3 ----------------------------------
let s3Client = null;
const getS3Client = () => {
  if (s3Client) return s3Client;
  // eslint-disable-next-line global-require
  const AWS = require('aws-sdk');
  const config = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    signatureVersion: 'v4',
  };
  if (env.AWS_S3_ENDPOINT) {
    config.endpoint = env.AWS_S3_ENDPOINT;
    config.s3ForcePathStyle = env.AWS_S3_FORCE_PATH_STYLE;
  }
  s3Client = new AWS.S3(config);
  return s3Client;
};

const s3Driver = {
  async getUploadUrl({ filename, filetype, filesize }) {
    const maxBytes = enforceMimeAndSize({ filetype, filesize });
    const s3 = getS3Client();
    const key = buildKey(filename);

    const url = await s3.getSignedUrlPromise('putObject', {
      Bucket: env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: filetype,
      Expires: 60,
    });

    const fileUrl = env.AWS_S3_ENDPOINT
      ? `${env.AWS_S3_ENDPOINT}/${env.AWS_BUCKET_NAME}/${key}`
      : `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

    return { url, fileUrl, key, method: 'PUT', maxBytes };
  },
};

// -------------------------------- SELECTOR -------------------------------
const driver = env.STORAGE_DRIVER === 's3' ? s3Driver : localDriver;

module.exports = {
  getUploadUrl: (...args) => driver.getUploadUrl(...args),
  writeLocalBuffer: localDriver.writeBuffer,
  driverName: env.STORAGE_DRIVER,
  ABSOLUTE_MAX_BYTES,
};
