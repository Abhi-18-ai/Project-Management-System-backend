import { createServer } from "node:http";
import mongoose from "mongoose";

import app from "./app.js";
import env from "./config/env.js";
import connectDatabase from "./config/db.js";
import logger from "./config/logger.js";
import { initSocket } from "./socket.js";

import "./models/user.model.js";
import "./models/refreshToken.model.js";
import "./models/project.model.js";
import "./models/projectMember.model.js";

let server;
let io;
let isShuttingDown = false;

const startServer = async () => {
  try {
    await connectDatabase();

    // Create the HTTP server using the Express app.
    server = createServer(app);

    // Attach Socket.IO to the same HTTP server.
    io = initSocket(server);

    server.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
    });
  } catch (error) {
    logger.error(`Error starting the server: ${error.message}`);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;

  isShuttingDown = true;
  logger.info(`${signal} received. Starting graceful shutdown...`);

  const closeDatabase = async () => {
    try {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
      process.exit(0);
    } catch (error) {
      logger.error(`Error during shutdown: ${error.message}`);
      process.exit(1);
    }
  };

  if (io) {
    // Closes Socket.IO connections and its underlying HTTP server.
    io.close(() => {
      logger.info("HTTP and Socket.IO servers closed");
      void closeDatabase();
    });
  } else if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
      void closeDatabase();
    });
  } else {
    await closeDatabase();
  }
};

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});

startServer();
