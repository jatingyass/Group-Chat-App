const express = require('express');
const { sendMessage } = require('../controllers/messageController');

router = express.Router();


router.post('/messages', sendMessage);

module.exports = router;