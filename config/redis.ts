/**
 * Redis Configuration for Session Storage
 * Provides persistent session storage for SCORM sessions across server restarts
 */

import Redis from 'ioredis';

/**
 * Redis connection configuration
 */
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
};

/**
 * Create Redis client instance
 */
export const redisClient = new Redis(redisConfig);

/**
 * Redis event handlers
 */
redisClient.on('connect', () => {
  console.log('✓ Redis client connected');
});

redisClient.on('ready', () => {
  console.log('✓ Redis client ready');
});

redisClient.on('error', (error) => {
  console.error('✗ Redis client error:', error.message);
});

redisClient.on('close', () => {
  console.log('✗ Redis client connection closed');
});

redisClient.on('reconnecting', () => {
  console.log('↻ Redis client reconnecting...');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('Closing Redis connection...');
  await redisClient.quit();
});

export default redisClient;
