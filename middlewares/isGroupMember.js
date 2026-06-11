const { GroupMember } = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const isGroupMember = catchAsync(async (req, res, next) => {
  const groupId = Number(req.params.groupId || req.body.groupId);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    throw ApiError.badRequest('Valid groupId is required');
  }

  const member = await GroupMember.findOne({
    where: { groupId, userId: req.user.id },
  });
  if (!member) {
    throw ApiError.forbidden('You are not a member of this group');
  }

  req.groupMember = member;
  next();
});

module.exports = isGroupMember;
