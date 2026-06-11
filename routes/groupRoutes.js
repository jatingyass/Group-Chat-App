const express = require('express');
const groupController = require('../controllers/groupController');
const { authenticate, isGroupAdmin } = require('../middlewares/authenticate');
const isGroupMember = require('../middlewares/isGroupMember');
const validate = require('../middlewares/validate');
const {
  createGroupSchema,
  groupIdParamSchema,
  inviteUserSchema,
  promoteUserSchema,
  removeMemberSchema,
} = require('../validation/group.schema');
const {
  sendMessageSchema,
  getMessagesParamSchema,
  getMessagesQuerySchema,
} = require('../validation/message.schema');

const router = express.Router();

router.use(authenticate);

// Groups
router.post('/groups', validate(createGroupSchema), groupController.createGroup);
router.get('/groups', groupController.getUserGroups);

// Members
router.get(
  '/groups/:groupId/members',
  validate(groupIdParamSchema, 'params'),
  isGroupMember,
  groupController.getGroupMembers,
);

router.post(
  '/groups/:groupId/leave',
  validate(groupIdParamSchema, 'params'),
  isGroupMember,
  groupController.leaveGroup,
);

// Group admin actions
router.post(
  '/groups/:groupId/invite',
  validate(groupIdParamSchema, 'params'),
  isGroupAdmin,
  validate(inviteUserSchema),
  groupController.inviteUser,
);
router.post(
  '/groups/:groupId/promote',
  validate(groupIdParamSchema, 'params'),
  isGroupAdmin,
  validate(promoteUserSchema),
  groupController.promoteToAdmin,
);
router.post(
  '/groups/:groupId/remove',
  validate(groupIdParamSchema, 'params'),
  isGroupAdmin,
  validate(removeMemberSchema),
  groupController.removeMember,
);

// Messages
router.get(
  '/messages/:groupId',
  validate(getMessagesParamSchema, 'params'),
  validate(getMessagesQuerySchema, 'query'),
  isGroupMember,
  groupController.getGroupMessages,
);
router.get(
  '/messages/:groupId/archive',
  validate(getMessagesParamSchema, 'params'),
  isGroupMember,
  groupController.getArchivedMessages,
);
router.post(
  '/messages',
  validate(sendMessageSchema),
  isGroupMember,
  groupController.sendMessage,
);

module.exports = router;
