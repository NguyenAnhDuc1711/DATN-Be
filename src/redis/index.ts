// redisClient.js
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  // password: 'your_redis_password', // if required
});

// Cache utility functions
export const setCache = async (key: string, value: any, ttlSeconds?: number): Promise<'OK'> => {
  const stringValue = JSON.stringify(value);
  if (ttlSeconds) {
    return redis.setex(key, ttlSeconds, stringValue);
  }
  return redis.set(key, stringValue);
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  const value = await redis.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Error parsing cached value for key ${key}:`, error);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<number> => {
  return redis.del(key);
};

export const clearCache = async (): Promise<'OK'> => {
  return redis.flushall();
};

export const setCacheWithHash = async (hash: string, key: string, value: any): Promise<number> => {
  const stringValue = JSON.stringify(value);
  return redis.hset(hash, key, stringValue);
};

export const getCacheFromHash = async <T>(hash: string, key: string): Promise<T | null> => {
  const value = await redis.hget(hash, key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Error parsing cached hash value for ${hash}:${key}:`, error);
    return null;
  }
};

export const deleteCacheFromHash = async (hash: string, key: string): Promise<number> => {
  return redis.hdel(hash, key);
};

export default redis;
