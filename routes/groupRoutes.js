const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const messageController = require('../controllers/messageController');
const {authenticate, isGroupAdmin} = require('../middlewares/authenticate'); // Token check karne ke liye
const isGroupMember = require('../middlewares/isGroupMember');

// Groups related
router.post('/groups', authenticate, groupController.createGroup);
router.get('/groups', authenticate, groupController.getUserGroups);
// router.post('/groups/:groupId/invite', authenticate,  groupController.inviteUser);

router.post('/groups/:groupId/invite', authenticate, isGroupAdmin,  groupController.inviteUser);
  
  router.post('/groups/:groupId/promote', authenticate, isGroupAdmin, groupController.promoteToAdmin);
  router.post('/groups/:groupId/remove', authenticate, isGroupAdmin, groupController.removeMember);

// Message routes
router.get('/messages/:groupId', authenticate, isGroupMember, groupController.getGroupMessages);
router.post('/messages', authenticate, isGroupMember, groupController.sendMessage);

module.exports = router;
