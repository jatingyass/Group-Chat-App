const jwt = require('jsonwebtoken');
const { User, GroupMember } = require('../models');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const extractToken = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return null;
};

const authenticate = catchAsync(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Authentication token missing');
  }

  const decoded = jwt.verify(token, env.JWT_SECRET);

  const user = await User.findByPk(decoded.id, {
    attributes: ['id', 'name', 'email'],
  });
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }

  req.user = { id: user.id, name: user.name, email: user.email };
  next();
});

const isGroupAdmin = catchAsync(async (req, res, next) => {
  const groupId = Number(req.params.groupId || req.body.groupId);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    throw ApiError.badRequest('Valid groupId is required');
  }

  const admin = await GroupMember.findOne({
    where: { groupId, userId: req.user.id, is_admin: true },
  });

  if (!admin) {
    throw ApiError.forbidden('Only group admins can perform this action');
  }
  next();
});

module.exports = { authenticate, isGroupAdmin };
