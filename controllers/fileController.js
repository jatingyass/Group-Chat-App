const storage = require('../services/storageService');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

exports.getPresignedUrl = catchAsync(async (req, res) => {
  const { filename, filetype, filesize } = req.query;
  const result = await storage.getUploadUrl({
    filename,
    filetype,
    filesize: filesize ? Number(filesize) : undefined,
  });
  res.json({ success: true, data: result });
});

// Used only when STORAGE_DRIVER=local: receives the raw file bytes from the
// client and writes them to the local uploads directory.
exports.localUpload = catchAsync(async (req, res) => {
  if (storage.driverName !== 'local') {
    throw ApiError.badRequest('Local upload is disabled when STORAGE_DRIVER is not "local"');
  }
  const { key } = req.query;
  if (!key || typeof key !== 'string') {
    throw ApiError.badRequest('Missing key query parameter');
  }

  const chunks = [];
  let size = 0;
  const MAX_BYTES = storage.ABSOLUTE_MAX_BYTES;

  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX_BYTES) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', async () => {
    if (size > MAX_BYTES) {
      return res
        .status(413)
        .json({ success: false, message: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` });
    }
    try {
      const fileUrl = await storage.writeLocalBuffer(key, Buffer.concat(chunks));
      res.status(200).json({ success: true, data: { fileUrl, fileSize: size } });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  req.on('error', (err) => {
    res.status(500).json({ success: false, message: err.message });
  });
});
