import { createServer } from "node:http";
import mongoose from "mongoose";

import app from "./app.js";
import env from "./config/env.js";
import connectDatabase from "./config/db.js";
import logger from "./config/logger.js";
import { connectRedis, closeRedis } from "./config/redis.js";
import { initSocket } from  "./socket.js";

import "./models/user.model.js";
import "./models/refreshToken.model.js";
import "./models/project.model.js";
import "./models/projectMember.model.js";

let server;
let io;
let isShuttingDown = false;

const startServer = async () => {
  try {
    //  MongoDB is required for the application.
    await connectDatabase();

    // Redis is optional for now.
    await connectRedis();

    // Create the shared HTTP server.
    server = createServer(app);

    // Attach Socket.IO.
    io = initSocket(server);

    // Start accepting requests.
    server.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
    });
  } catch (error) {
    logger.error(`Error starting the server: ${error.message}`);
    await closeRedis();
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;

  isShuttingDown = true;
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    // Close Socket.IO and its underlying HTTP server.
    if (io) {
      await new Promise((resolve) => {
        io.close(() => {
          logger.info("HTTP and Socket.IO servers closed");
          resolve();
        });
      });
    } else if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    // Close Redis before closing MongoDB.
    await closeRedis();

    // Close MongoDB last.
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");

    process.exit(0);
  } catch (error) {
    logger.error(`Error during shutdown: ${error.message}`);
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});

startServer();
