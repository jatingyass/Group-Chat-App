const express = require('express');
const { sendMessage, getAllMessages } = require('../controllers/messageController');

const router = express.Router();

router.post('/messages', sendMessage);
router.get('/messages', getAllMessages);

module.exports = router;
