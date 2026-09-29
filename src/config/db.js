import mongoose from "mongoose";
import env from "./env.js";
import logger from "../config/logger.js";

const connectDatabase = async () => {
  try {
    await mongoose.connect(env.mongoUri)
    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error("MongoDB connection failed:", error.message);
    // process.exit(1);

    throw error;
  }
};

export default connectDatabase;