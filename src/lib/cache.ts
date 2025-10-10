/**
 * Кэш для API endpoints
 * Поддерживает Redis (Upstash) и in-memory fallback
 */

interface CacheConfig {
  ttl: number; // время жизни в секундах
  key: string;
}

class CacheManager {
  private memoryCache = new Map<string, { data: any; expires: number }>();
  private useRedis = false;
  private redisClient: any = null;

  constructor() {
    // Проверяем наличие Redis URL
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.initRedis();
    } else {
      console.log('ℹ️ Redis not configured, using memory cache only');
    }
  }

  private async initRedis() {
    try {
      // Пытаемся использовать Upstash Redis только если есть переменные окружения
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const { Redis } = await import('@upstash/redis');
        this.redisClient = Redis.fromEnv();
        this.useRedis = true;
        console.log('✅ Redis cache initialized');
      } else {
        console.log('ℹ️ Redis not configured, using memory cache');
        this.useRedis = false;
      }
    } catch (error) {
      console.warn('⚠️ Redis not available, using memory cache:', error);
      this.useRedis = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis && this.redisClient) {
      try {
        const data = await this.redisClient.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.warn('Redis get error:', error);
        return this.getFromMemory<T>(key);
      }
    }
    
    return this.getFromMemory<T>(key);
  }

  private getFromMemory<T>(key: string): T | null {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;
    
    if (cached.expires < Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.setex(key, ttl, JSON.stringify(data));
        return;
      } catch (error) {
        console.warn('Redis set error:', error);
      }
    }
    
    // Fallback to memory cache
    this.memoryCache.set(key, {
      data,
      expires: Date.now() + (ttl * 1000)
    });
  }

  async invalidate(pattern: string): Promise<void> {
    if (this.useRedis && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (error) {
        console.warn('Redis invalidate error:', error);
      }
    }
    
    // Fallback: clear memory cache entries matching pattern
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Singleton instance
const cache = new CacheManager();

/**
 * Декоратор для кэширования API endpoints
 */
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttl: number = 300 // 5 минут по умолчанию
) {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args);
    
    // Пытаемся получить из кэша
    const cached = await cache.get<R>(key);
    if (cached) {
      console.log(`📦 Cache hit: ${key}`);
      return cached;
    }
    
    // Выполняем функцию и кэшируем результат
    console.log(`🔄 Cache miss: ${key}`);
    const result = await fn(...args);
    await cache.set(key, result, ttl);
    
    return result;
  };
}

/**
 * Утилиты для работы с кэшем
 */
export const cacheUtils = {
  async get<T>(key: string): Promise<T | null> {
    return cache.get<T>(key);
  },
  
  async set<T>(key: string, data: T, ttl: number = 300): Promise<void> {
    return cache.set(key, data, ttl);
  },
  
  async invalidate(pattern: string): Promise<void> {
    return cache.invalidate(pattern);
  },
  
  // Предустановленные ключи для разных типов данных
  keys: {
    users: (city?: string, role?: string) => `users:${city || 'all'}:${role || 'all'}`,
    countryAnalytics: (weekIso: string) => `country-analytics:${weekIso}`,
    dashboardStats: (userId: string) => `dashboard-stats:${userId}`,
    workSchedules: (userId: string, weekStart?: string) => `work-schedules:${userId}:${weekStart || 'all'}`,
  }
};

export default cache;