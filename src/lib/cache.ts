/**
 * Абстракция над кэшем с поддержкой Redis и In-Memory
 * 
 * Использование:
 * 1. In-Memory (текущее): работает, но только на одном инстансе
 * 2. Redis (будущее): добавить REDIS_URL в .env и всё автоматически переключится
 */

import { logger } from './logger';

export interface CacheOptions {
  ttl?: number; // Time to live в секундах
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * In-Memory кэш (для локальной разработки и одного инстанса)
 */
class InMemoryCache implements Cache {
  private cache = new Map<string, { value: any; expiresAt: number | null }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const expiresAt = options.ttl ? Date.now() + options.ttl * 1000 : null;
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

/**
 * Redis кэш (для production с несколькими инстансами)
 * 
 * Установка:
 * npm install @upstash/redis
 * 
 * Настройка:
 * REDIS_URL=https://... или UPSTASH_REDIS_REST_URL=...
 */
class RedisCache implements Cache {
  private redis: any;

  constructor() {
    try {
      const { Redis } = require('@upstash/redis');
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
      
      if (!redisUrl) {
        throw new Error('REDIS_URL not configured');
      }
      
      this.redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      
      logger.info('Redis cache initialized');
    } catch (error) {
      logger.error('Failed to initialize Redis', { error });
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value as T | null;
    } catch (error) {
      logger.error('Redis GET error', { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      if (options.ttl) {
        await this.redis.set(key, value, { ex: options.ttl });
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Redis DELETE error', { key, error });
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      logger.error('Redis CLEAR error', { error });
    }
  }
}

/**
 * Фабрика кэша - автоматически выбирает Redis или In-Memory
 */
function createCache(): Cache {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  
  if (redisUrl && process.env.NODE_ENV === 'production') {
    try {
      return new RedisCache();
    } catch (error) {
      logger.warn('Failed to create Redis cache, falling back to In-Memory', { error });
      return new InMemoryCache();
    }
  }
  
  logger.info('Using In-Memory cache');
  return new InMemoryCache();
}

// Singleton instance
export const cache: Cache = createCache();

/**
 * Helper для кэширования результатов функций
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = { ttl: 60 }
): Promise<T> {
  // Проверяем кэш
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    logger.debug('Cache hit', { key });
    return cached;
  }
  
  // Кэш промахнулся, выполняем функцию
  logger.debug('Cache miss', { key });
  const result = await fn();
  
  // Сохраняем в кэш
  await cache.set(key, result, options);
  
  return result;
}

