// middlewares/isGroupMember.js
const { GroupMember } = require('../models');

module.exports = async (req, res, next) => {
  const groupId = req.params.groupId || req.body.groupId;
  const userId = req.user.id;

  const member = await GroupMember.findOne({ where: { groupId, userId } });
  if (!member) {
    return res.status(403).json({ message: 'Access denied: Not a group member.' });
  }

  next();
};
