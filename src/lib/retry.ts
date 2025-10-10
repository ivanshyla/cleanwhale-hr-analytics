/**
 * Утилиты для retry и timeout внешних сервисов
 */

import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  timeout: 30000, // 30 секунд
};

/**
 * Задержка с возможностью отмены
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Выполняет функцию с retry и exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Применяем timeout
      const result = await withTimeout(fn(), opts.timeout);
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < opts.maxRetries) {
        // Вычисляем задержку с exponential backoff
        const delayMs = Math.min(
          opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
          opts.maxDelay
        );
        
        logger.warn('Retry attempt', {
          attempt: attempt + 1,
          maxRetries: opts.maxRetries,
          delayMs,
          error: lastError.message,
        });
        
        options.onRetry?.(lastError, attempt + 1);
        
        await delay(delayMs);
      }
    }
  }
  
  logger.error('All retry attempts failed', {
    maxRetries: opts.maxRetries,
    error: lastError!.message,
  });
  
  throw lastError!;
}

/**
 * Выполняет функцию с таймаутом
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Специализированная функция для OpenAI с retry
 */
export async function withOpenAIRetry<T>(
  fn: () => Promise<T>
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 10000,
    timeout: 60000, // 60 секунд для OpenAI
    onRetry: (error, attempt) => {
      logger.warn('OpenAI retry', { attempt, error: error.message });
    },
  });
}

/**
 * Специализированная функция для Telegram с retry
 */
export async function withTelegramRetry<T>(
  fn: () => Promise<T>
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 2,
    initialDelay: 500,
    maxDelay: 2000,
    timeout: 10000, // 10 секунд для Telegram
    onRetry: (error, attempt) => {
      logger.warn('Telegram retry', { attempt, error: error.message });
    },
  });
}

