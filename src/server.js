import mongoose from "mongoose";

import app from "./app.js";
import env from "./config/env.js";
import connectDatabase from "./config/db.js";
import logger from "./config/logger.js";
import "./models/user.model.js";
import "./models/refreshToken.model.js";
import "./models/project.model.js";
import "./models/projectMember.model.js";


let server;
const startServer = async () => {
  try {
    await connectDatabase();

    server = app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
    });
  } catch (error) {
    logger.error("Error starting the server:", error.message);
    process.exit(1);
  }

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    if (server) {
      server.close(async () => {
        logger.info("HTTP server closed");

        try {
          await import("mongoose").then(async ({ default: mongoose }) => {
            await mongoose.connection.close();
          });

          logger.info("MongoDB connection closed");
          process.exit(0);
        } catch (error) {
          logger.error(`Error during shutdown: ${error.message}`);

          process.exit(1);
        }
      });
    } else {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => {
    gracefulShutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    gracefulShutdown("SIGTERM");
  });
};

startServer();
