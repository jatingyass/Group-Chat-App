const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const messageController = require('../controllers/messageController');
const authenticate = require('../middlewares/authenticate'); // Token check karne ke liye
const isGroupMember = require('../middlewares/isGroupMember');

// Groups related
router.post('/groups', authenticate, groupController.createGroup);
router.get('/groups', authenticate, groupController.getUserGroups);
//router.post('/groups/:groupId/invite', authenticate,  groupController.inviteUser);

router.post('/groups/:groupId/invite', authenticate, (req, res, next) => {
    console.log('Invite route hit ✅');
    next();
  }, groupController.inviteUser);
  


// Messages related
// router.get('/messages/:groupId', authenticate, messageController.getGroupMessages); 
// router.post('/messages', authenticate, messageController.sendMessage);



// Message routes
router.get('/messages/:groupId', authenticate, isGroupMember, messageController.getGroupMessages);
router.post('/messages', authenticate, isGroupMember, messageController.sendMessage);

module.exports = router;
