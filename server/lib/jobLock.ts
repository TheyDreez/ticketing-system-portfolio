import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 50, 2000);
  }
});

redis.on('error', (err) => {
  logger.warn('Redis connection error in jobLock: ' + (err instanceof Error ? err.message : String(err)));
});

export async function runWithLock(jobName: string, ttlSeconds: number, jobFn: () => Promise<void>) {
  const lockKey = `lock:${jobName}`;
  try {
    const acquired = await redis.set(lockKey, 'locked', 'EX', ttlSeconds, 'NX');
    if (acquired === 'OK') {
      await jobFn();
    }
  } catch (err: unknown) {
    logger.error(`Error acquiring lock for ${jobName}: ${(err instanceof Error ? err.message : String(err))}`);
  }
}
