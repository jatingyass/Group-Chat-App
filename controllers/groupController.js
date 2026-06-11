const { Op } = require('sequelize');
const {
  metaDb,
  Group,
  GroupMember,
  User,
  getMessage,
  getArchivedMessage,
  getColdMessage,
} = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

exports.createGroup = catchAsync(async (req, res) => {
  const { name, members } = req.body;
  const userId = req.user.id;

  // Group + GroupMember inserts share the metaDb, so a single transaction
  // is enough. Messages are sharded but we don't write any here.
  const group = await metaDb.transaction(async (t) => {
    const created = await Group.create({ name, createdBy: userId }, { transaction: t });

    const rows = [
      { groupId: created.id, userId, is_admin: true, added_by: userId },
      ...(members || [])
        .filter((mid) => mid !== userId)
        .map((mid) => ({
          groupId: created.id,
          userId: mid,
          is_admin: false,
          added_by: userId,
        })),
    ];

    await GroupMember.bulkCreate(rows, { transaction: t, ignoreDuplicates: true });
    return created;
  });

  res.status(201).json({
    success: true,
    message: 'Group created successfully',
    data: group,
  });
});

exports.getUserGroups = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const groups = await Group.findAll({
    include: {
      model: GroupMember,
      where: { userId },
      attributes: ['is_admin'],
    },
    attributes: ['id', 'name', 'createdAt'],
    order: [['createdAt', 'DESC']],
  });
  res.status(200).json({ success: true, data: groups });
});

exports.getGroupMembers = catchAsync(async (req, res) => {
  const groupId = Number(req.params.groupId);
  const members = await GroupMember.findAll({
    where: { groupId },
    include: { model: User, attributes: ['id', 'name', 'email'] },
    order: [
      ['is_admin', 'DESC'],
      ['createdAt', 'ASC'],
    ],
  });

  const data = members.map((m) => ({
    id: m.User.id,
    name: m.User.name,
    email: m.User.email,
    isAdmin: m.is_admin,
    joinedAt: m.createdAt,
  }));

  res.status(200).json({ success: true, data });
});

exports.sendMessage = catchAsync(async (req, res) => {
  const { groupId, message, fileUrl, fileName, fileMimeType, fileSize } = req.body;
  const userId = req.user.id;
  const userName = req.user.name;

  const Message = getMessage(groupId);
  const newMessage = await Message.create({
    userId,
    userName,
    groupId,
    message,
    fileUrl,
    fileName,
    fileMimeType,
    fileSize,
  });

  res.status(201).json({ success: true, data: newMessage });
});

exports.getGroupMessages = catchAsync(async (req, res) => {
  const groupId = Number(req.params.groupId);
  const { limit = 50, before } = req.query;

  const where = { groupId };
  if (before) where.id = { [Op.lt]: Number(before) };

  const Message = getMessage(groupId);
  const messages = await Message.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
  });

  res.status(200).json({ success: true, data: messages.reverse() });
});

// Pulls older messages from the warm + cold tiers. Both tiers live on the
// same shard for a given groupId, so this is still a single-shard read.
exports.getArchivedMessages = catchAsync(async (req, res) => {
  const groupId = Number(req.params.groupId);
  const { before, limit = 50 } = req.query;

  const beforeDate = before ? new Date(Number(before)) : new Date();
  if (Number.isNaN(beforeDate.getTime())) {
    throw ApiError.badRequest('"before" must be a unix-millis timestamp');
  }

  const ArchivedMessage = getArchivedMessage(groupId);
  const ColdMessage = getColdMessage(groupId);

  const order = [['createdAt', 'DESC']];
  const lim = Math.min(Number(limit), 100);

  const warm = await ArchivedMessage.findAll({
    where: { groupId, createdAt: { [Op.lt]: beforeDate } },
    order,
    limit: lim,
  });

  let cold = [];
  if (warm.length < lim) {
    const oldestWarm = warm[warm.length - 1]?.createdAt || beforeDate;
    cold = await ColdMessage.findAll({
      where: { groupId, createdAt: { [Op.lt]: oldestWarm } },
      order,
      limit: lim - warm.length,
    });
  }

  const annotate = (rows, tier) =>
    rows.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.userName,
      groupId: m.groupId,
      message: m.message,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileMimeType: m.fileMimeType,
      fileSize: m.fileSize ? Number(m.fileSize) : null,
      createdAt: m.createdAt,
      tier,
    }));

  const combined = [...annotate(warm, 'warm'), ...annotate(cold, 'cold')]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  res.status(200).json({
    success: true,
    data: combined,
    meta: { warmCount: warm.length, coldCount: cold.length },
  });
});

exports.inviteUser = catchAsync(async (req, res) => {
  const groupId = Number(req.params.groupId);
  const { email } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) throw ApiError.notFound('User not found with that email');

  const existing = await GroupMember.findOne({ where: { groupId, userId: user.id } });
  if (existing) throw ApiError.conflict('User is already in this group');

  await GroupMember.create({
    groupId,
    userId: user.id,
    is_admin: false,
    added_by: req.user.id,
  });

  res.status(200).json({
    success: true,
    message: 'User invited successfully',
    data: { id: user.id, name: user.name, email: user.email, isAdmin: false },
  });
});

exports.promoteToAdmin = catchAsync(async (req, res) => {
  const groupId = Number(req.params.groupId);
  const { userNameToPromote } = req.body;

  const user = await User.findOne({ where: { name: userNameToPromote } });
  if (!user) throw ApiError.notFound('User not found');

  const member = await GroupMember.findOne({ where: { groupId, userId: user.id } });
  if (!member) throw ApiError.notFound('User is not a member of this group');

  if (member.is_admin) {
    return res.status(200).json({ success: true, message: 'User is already an admin' });
  }

  member.is_admin = true;
  await member.save();
  res.status(200).json({ success: true, message: 'User promoted to admin' });
});

exports.removeMember = catchAsync(async (req, res) => {
  const groupId = Number(req.params.groupId);
  const { userEmailToRemove } = req.body;

  const user = await User.findOne({ where: { email: userEmailToRemove } });
  if (!user) throw ApiError.notFound('User not found');

  const group = await Group.findByPk(groupId);
  if (group && group.createdBy === user.id) {
    throw ApiError.forbidden('Cannot remove the group creator');
  }

  const deleted = await GroupMember.destroy({ where: { groupId, userId: user.id } });
  if (!deleted) throw ApiError.notFound('User is not a member of this group');

  res.status(200).json({ success: true, message: 'User removed from group' });
});

exports.leaveGroup = catchAsync(async (req, res) => {
  const groupId = Number(req.params.groupId);
  const userId = req.user.id;

  const group = await Group.findByPk(groupId);
  if (!group) throw ApiError.notFound('Group not found');
  if (group.createdBy === userId) {
    throw ApiError.forbidden('Group creator cannot leave; delete the group instead');
  }

  const deleted = await GroupMember.destroy({ where: { groupId, userId } });
  if (!deleted) throw ApiError.notFound('You are not a member of this group');

  res.status(200).json({ success: true, message: 'Left the group' });
});
