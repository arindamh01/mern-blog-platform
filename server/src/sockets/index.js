const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyAccessToken } = require('../services/token.service');
const { ROLES } = require('../utils/constants');
const logger = require('../utils/logger');

let io = null;

const userRoom = (userId) => `user:${userId}`;
const ADMIN_ROOM = 'admins';

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const payload = verifyAccessToken(socket.handshake.auth?.token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.data.userId));
    if (socket.data.role === ROLES.ADMIN) socket.join(ADMIN_ROOM);
    logger.info(`Socket connected: user ${socket.data.userId}`);
  });

  return io;
}

const getIO = () => io;

module.exports = { initSocket, getIO, userRoom, ADMIN_ROOM };
