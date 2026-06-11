const express = require('express');
const { getPresignedUrl, localUpload } = require('../controllers/fileController');
const { authenticate } = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const { presignedUrlQuerySchema } = require('../validation/message.schema');

const router = express.Router();

// IMPORTANT: file upload URLs require an authenticated user
router.get(
  '/get-presigned-url',
  authenticate,
  validate(presignedUrlQuerySchema, 'query'),
  getPresignedUrl,
);

// Used by the local-storage driver only — accepts raw bytes via PUT body.
// In s3 mode, the browser PUTs directly to S3, bypassing this server.
router.put('/upload', authenticate, localUpload);

module.exports = router;
