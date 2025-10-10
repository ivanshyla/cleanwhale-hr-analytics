/**
 * Job Locking для идемпотентности крон-задач
 * Предотвращает параллельное выполнение одной и той же задачи
 */

import { prisma } from './prisma';
import { logger } from './logger';

export interface JobLock {
  jobName: string;
  key: string;
  startedAt: Date;
  expiresAt: Date;
}

const DEFAULT_TIMEOUT = 600000; // 10 минут

/**
 * Пытается получить блокировку для выполнения задачи
 * Возвращает true если блокировка получена, false если задача уже выполняется
 */
export async function acquireLock(
  jobName: string,
  key: string,
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<boolean> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutMs);
    
    // Проверяем существующие блокировки
    const existing = await prisma.jobLock.findUnique({
      where: { jobName_key: { jobName, key } },
    });
    
    // Если блокировка существует и не истекла
    if (existing && existing.expiresAt > now) {
      logger.warn('Job already running', {
        jobName,
        key,
        startedAt: existing.startedAt,
        expiresAt: existing.expiresAt,
      });
      return false;
    }
    
    // Создаем или обновляем блокировку
    await prisma.jobLock.upsert({
      where: { jobName_key: { jobName, key } },
      create: {
        jobName,
        key,
        startedAt: now,
        expiresAt,
      },
      update: {
        startedAt: now,
        expiresAt,
      },
    });
    
    logger.info('Lock acquired', { jobName, key, expiresAt });
    return true;
  } catch (error) {
    logger.error('Failed to acquire lock', { jobName, key, error });
    return false;
  }
}

/**
 * Освобождает блокировку после выполнения задачи
 */
export async function releaseLock(
  jobName: string,
  key: string
): Promise<void> {
  try {
    await prisma.jobLock.delete({
      where: { jobName_key: { jobName, key } },
    });
    
    logger.info('Lock released', { jobName, key });
  } catch (error) {
    logger.error('Failed to release lock', { jobName, key, error });
  }
}

/**
 * Выполняет задачу с автоматической блокировкой
 */
export async function withLock<T>(
  jobName: string,
  key: string,
  fn: () => Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<T | null> {
  const acquired = await acquireLock(jobName, key, timeoutMs);
  
  if (!acquired) {
    logger.warn('Skipping job execution - already running', { jobName, key });
    return null;
  }
  
  try {
    const result = await fn();
    await releaseLock(jobName, key);
    return result;
  } catch (error) {
    logger.error('Job execution failed', { jobName, key, error });
    await releaseLock(jobName, key);
    throw error;
  }
}

/**
 * Очищает просроченные блокировки (можно вызывать периодически)
 */
export async function cleanupExpiredLocks(): Promise<number> {
  try {
    const result = await prisma.jobLock.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    
    if (result.count > 0) {
      logger.info('Cleaned up expired locks', { count: result.count });
    }
    
    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup expired locks', { error });
    return 0;
  }
}

