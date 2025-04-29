const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const messageController = require('../controllers/messageController');
const authenticate = require('../middlewares/authenticate'); // Token check karne ke liye

// Groups related
router.post('/groups', authenticate, groupController.createGroup);
router.get('/groups', authenticate, groupController.getUserGroups);

// Messages related
router.get('/messages/:groupId', authenticate, messageController.getGroupMessages); 
router.post('/messages', authenticate, messageController.sendMessage);

module.exports = router;
