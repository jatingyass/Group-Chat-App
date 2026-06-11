const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const env = require('../config/env');
const logger = require('../utils/logger');
const { User, GroupMember, getMessage } = require('../models');

const authMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.token;
    if (!token) return next(new Error('Authentication token missing'));

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, { attributes: ['id', 'name', 'email'] });
    if (!user) return next(new Error('User not found'));

    socket.user = { id: user.id, name: user.name, email: user.email };
    return next();
  } catch (err) {
    return next(new Error('Invalid or expired token'));
  }
};

const ensureMembership = async (socket, groupId) => {
  socket._memberships ||= new Set();
  if (socket._memberships.has(groupId)) return true;

  const member = await GroupMember.findOne({ where: { groupId, userId: socket.user.id } });
  if (member) {
    socket._memberships.add(groupId);
    return true;
  }
  return false;
};

const attachRedisAdapter = async (io) => {
  if (!env.REDIS_URL) {
    logger.info('socket.io: single-instance mode (no REDIS_URL)');
    return;
  }
  try {
    /* eslint-disable global-require */
    const { createAdapter } = require('@socket.io/redis-adapter');
    const Redis = require('ioredis');
    /* eslint-enable global-require */

    const pubClient = new Redis(env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));

    pubClient.on('error', (err) => logger.error(`redis pub error: ${err.message}`));
    subClient.on('error', (err) => logger.error(`redis sub error: ${err.message}`));
    logger.info(`socket.io: redis adapter active at ${env.REDIS_URL}`);
  } catch (err) {
    logger.error(`socket.io: failed to attach redis adapter — ${err.message}`);
  }
};

const initSocket = async (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6,
  });

  await attachRedisAdapter(io);
  io.use(authMiddleware);

  io.on('connection', (socket) => {
    logger.info(`socket connected: user=${socket.user.id} sid=${socket.id}`);

    socket.on('join-group', async (rawGroupId, ack) => {
      const groupId = Number(rawGroupId);
      if (!Number.isInteger(groupId) || groupId <= 0) {
        return ack?.({ ok: false, error: 'Invalid groupId' });
      }
      const allowed = await ensureMembership(socket, groupId);
      if (!allowed) return ack?.({ ok: false, error: 'Not a member of this group' });

      socket.join(`group:${groupId}`);
      ack?.({ ok: true });
    });

    socket.on('leave-group', (rawGroupId, ack) => {
      const groupId = Number(rawGroupId);
      socket._memberships?.delete(groupId);
      socket.leave(`group:${groupId}`);
      ack?.({ ok: true });
    });

    socket.on('send-message', async (payload, ack) => {
      try {
        const groupId = Number(payload?.groupId);
        const text = String(payload?.message ?? '').trim();
        const fileUrl = payload?.fileUrl ? String(payload.fileUrl) : null;
        const fileName = payload?.fileName ? String(payload.fileName).slice(0, 255) : null;
        const fileMimeType = payload?.fileMimeType ? String(payload.fileMimeType).slice(0, 100) : null;
        const fileSize = payload?.fileSize != null ? Math.max(0, Number(payload.fileSize)) : null;

        if (!Number.isInteger(groupId) || groupId <= 0) {
          return ack?.({ ok: false, error: 'Invalid groupId' });
        }
        if (text.length > 2000) {
          return ack?.({ ok: false, error: 'Message exceeds 2000 chars' });
        }
        if (!text && !fileUrl) {
          return ack?.({ ok: false, error: 'Empty message — provide text or attachment' });
        }

        const allowed = await ensureMembership(socket, groupId);
        if (!allowed) return ack?.({ ok: false, error: 'Not a member of this group' });

        // Route the write to the shard that owns this groupId.
        const Message = getMessage(groupId);
        const saved = await Message.create({
          userId: socket.user.id,
          userName: socket.user.name,
          groupId,
          message: text,
          fileUrl,
          fileName,
          fileMimeType,
          fileSize,
        });

        const wire = {
          id: saved.id,
          userId: saved.userId,
          userName: saved.userName,
          groupId: saved.groupId,
          message: saved.message,
          fileUrl: saved.fileUrl,
          fileName: saved.fileName,
          fileMimeType: saved.fileMimeType,
          fileSize: saved.fileSize ? Number(saved.fileSize) : null,
          createdAt: saved.createdAt,
        };

        io.to(`group:${groupId}`).emit('receive-message', wire);
        ack?.({ ok: true, data: wire });
      } catch (err) {
        logger.error(`send-message failed: ${err.message}`);
        ack?.({ ok: false, error: 'Failed to send message' });
      }
    });

    socket.on('typing', (payload) => {
      const groupId = Number(payload?.groupId);
      if (!Number.isInteger(groupId) || groupId <= 0) return;
      socket.to(`group:${groupId}`).emit('typing', {
        userId: socket.user.id,
        userName: socket.user.name,
      });
    });

    socket.on('disconnect', (reason) => {
      logger.info(`socket disconnected: user=${socket.user.id} sid=${socket.id} reason=${reason}`);
    });
  });

  return io;
};

module.exports = { initSocket };
