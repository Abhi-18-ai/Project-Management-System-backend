import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import env from "./config/env.js";
import logger from "./config/logger.js";

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
    },
  });

  // Authenticate every incoming socket connection.
  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (typeof token !== "string" || !token.trim()) {
        return next(new Error("Access token required"));
      }

      // Also support tokens sent as "Bearer <token>".
      token = token.replace(/^Bearer\s+/i, "").trim();

      const decoded = jwt.verify(token, env.accessTokenSecret);

      if (typeof decoded === "string" || !decoded.sub) {
        return next(new Error("Invalid access token payload"));
      }

      socket.data.userId = decoded.sub;
      socket.data.role = decoded.role;

      next();
    } catch (error) {
      logger.warn(`Socket authentication failed: ${error.message}`);
      next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    // Each user joins their own private room.
    socket.join(`user:${userId}`);

    logger.info(`Socket connected for user ${userId}`);

    socket.on("disconnect", (reason) => {
      logger.info(`Socket disconnected: ${reason}`);
    });
  });

  return io;
};

const emitToUser = (userId, event, payload) => {
  if (!io) {
    logger.warn("Socket.IO is not initialized; event was not emitted");
    return;
  }

  io.to(`user:${userId}`).emit(event, payload);
};

export { initSocket, emitToUser };
