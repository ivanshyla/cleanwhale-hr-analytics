/**
 * Professional Logging System
 * 
 * Заменяет console.log на структурированное логирование
 * с уровнями, контекстом и форматированием
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private isDevelopment: boolean;
  private minLevel: LogLevel;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  /**
   * Форматирует log entry для вывода
   */
  private format(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry;
    
    const emoji = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
    };

    let output = `${emoji[level]} [${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (context && Object.keys(context).length > 0) {
      output += `\n   Context: ${JSON.stringify(context, null, 2)}`;
    }

    if (error) {
      output += `\n   Error: ${error.message}`;
      if (this.isDevelopment && error.stack) {
        output += `\n   Stack: ${error.stack}`;
      }
    }

    return output;
  }

  /**
   * Проверяет, нужно ли логировать это сообщение
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentIndex = levels.indexOf(level);
    const minIndex = levels.indexOf(this.minLevel);
    return currentIndex >= minIndex;
  }

  /**
   * Основной метод логирования
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    const formatted = this.format(entry);

    // В production можно интегрировать с внешними сервисами (Sentry, LogRocket, etc)
    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted);
        // TODO: Отправить в Sentry/error tracking
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.DEBUG:
        console.log(formatted);
        break;
    }
  }

  /**
   * Debug - детальная информация для разработки
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info - общая информация о работе приложения
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warn - предупреждения, которые требуют внимания
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error - ошибки, которые нужно исправлять
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.log(LogLevel.ERROR, message, context, errorObj);
  }

  /**
   * API Request logging helper
   */
  apiRequest(method: string, path: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${path}`, context);
  }

  /**
   * API Response logging helper
   */
  apiResponse(method: string, path: string, statusCode: number, context?: LogContext): void {
    const message = `API Response: ${method} ${path} - ${statusCode}`;
    if (statusCode >= 500) {
      this.error(message, undefined, context);
    } else if (statusCode >= 400) {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  /**
   * Auth event logging
   */
  authEvent(event: 'login' | 'logout' | 'unauthorized', context?: LogContext): void {
    const messages = {
      login: 'User logged in',
      logout: 'User logged out',
      unauthorized: 'Unauthorized access attempt',
    };
    
    const level = event === 'unauthorized' ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, messages[event], context);
  }

  /**
   * Database query logging
   */
  dbQuery(query: string, duration?: number, context?: LogContext): void {
    const message = duration 
      ? `DB Query (${duration}ms): ${query}`
      : `DB Query: ${query}`;
    
    this.debug(message, context);
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports
export default logger;


