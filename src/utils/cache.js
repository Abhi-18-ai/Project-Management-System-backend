import redis from "../config/redis.js";
import logger from "../config/logger.js";

const getCache = async (key) => {
  try {
    if (redis.status !== "ready") return null;

    const cachedData = await redis.get(key);

    if (!cachedData) return null;

    return JSON.parse(cachedData);
  } catch (error) {
    logger.warn(`Cache read failed: ${error.message}`);
    return null;
  }
};

const setCache = async (key, data, ttlSeconds = 60) => {
  try {
    if (redis.status !== "ready") return;

    await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
  } catch (error) {
    logger.warn(`Cache write failed: ${error.message}`);
  }
};

const deleteCache = async (key) => {
  try {
    if (redis.status !== "ready") return;

    await redis.del(key);
  } catch (error) {
    logger.warn(`Cache deletion failed: ${error.message}`);
  }
};

export { getCache, setCache, deleteCache };
