const express = require('express');
const router = express.Router();
const { getPresignedUrl } = require('../controllers/fileController');

router.get('/get-presigned-url', getPresignedUrl);

module.exports = router;
