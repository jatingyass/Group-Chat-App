const { generatePresignedUrl } = require('../services/s3Service');

exports.getPresignedUrl = async (req, res) => {
  const { filename, filetype } = req.query;

  try {
    const { url, fileUrl } = await generatePresignedUrl(filename, filetype);
    res.json({ url, fileUrl });
  } catch (error) {
    console.error("Presigned URL error:", error);
    res.status(500).json({ error: "Failed to generate presigned URL" });
  }
};
