import Redis from "ioredis";
import env from "./env.js";
import logger from "./logger.js";

const redis = new Redis(env.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,

  retryStrategy(times) {
    return Math.min(times * 500, 5000);
  },
});

// Connection established, but Redis may not be ready yet.
redis.on("connect", () => {
  logger.info("Redis connection established");
});

redis.on("ready", () => {
  logger.info("Redis is ready to accept commands");
});

redis.on("error", (error) => {
  logger.error(`Redis error: ${error.message}`);
});

redis.on("close", () => {
  logger.warn("Redis connection closed");
});

redis.on("reconnecting", () => {
  logger.info("Reconnecting to Redis...");
});

const connectRedis = async () => {
  try {
    await redis.connect();
    return true;
  } catch (error) {
    logger.warn(
      `Redis unavailable; continuing without cache: ${error.message}`,
    );
    return false;
  }
};

const closeRedis = async () => {
  try {
    if (redis.status === "ready") {
      await redis.quit();
    } else {
      redis.disconnect();
    }

    logger.info("Redis connection closed successfully");
  } catch (error) {
    logger.error(`Error closing Redis: ${error.message}`);
    redis.disconnect();
  }
};

export { connectRedis, closeRedis };
export default redis;
