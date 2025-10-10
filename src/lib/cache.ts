/**
 * Кэш для API endpoints
 * Использует in-memory кэш (Redis опционален и отключен для упрощения)
 */

interface CacheConfig {
  ttl: number; // время жизни в секундах
  key: string;
}

class CacheManager {
  private memoryCache = new Map<string, { data: any; expires: number }>();

  constructor() {
    console.log('ℹ️ Using in-memory cache');
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;
    
    if (cached.expires < Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    this.memoryCache.set(key, {
      data,
      expires: Date.now() + (ttl * 1000)
    });
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear memory cache entries matching pattern
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