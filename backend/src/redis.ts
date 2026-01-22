import Redis from "ioredis";
import { config } from "./config";

export const redis = new Redis(config.redisUrl);

export const acquireLock = async (
  key: string,
  ttlSeconds: number
): Promise<boolean> => {
  const result = await redis.set(key, "locked", "EX", ttlSeconds, "NX");
  return result === "OK";
};

export const releaseLock = async (key: string): Promise<void> => {
  await redis.del(key);
};
