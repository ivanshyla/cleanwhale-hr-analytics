/**
 * Environment Variables Validation
 * 
 * Проверяет наличие всех критических переменных окружения
 * при запуске приложения. Предотвращает запуск с неполной конфигурацией.
 */

// Критические переменные, без которых приложение не должно работать
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
] as const;

// Опциональные переменные с предупреждениями
const optionalEnvVars = [
  'OPENAI_API_KEY',
  'TRENGO_API_TOKEN',
  'CRM_API_URL',
] as const;

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Валидирует переменные окружения
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Проверка обязательных переменных
  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    
    if (!value) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else if (value.includes('CHANGE_THIS') || value.includes('your-')) {
      errors.push(`Environment variable ${varName} contains placeholder value. Please set a real value.`);
    }
  }

  // Дополнительные проверки
  
  // JWT_SECRET должен быть достаточно длинным
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long for security');
    }
    if (process.env.JWT_SECRET === 'fallback-secret') {
      errors.push('JWT_SECRET cannot be "fallback-secret" - this is insecure!');
    }
    if (process.env.JWT_SECRET === 'hr-analytics-super-secret-jwt-key-2024') {
      warnings.push('JWT_SECRET is using default value from examples. Consider changing it for production.');
    }
  }

  // DATABASE_URL должен быть валидным
  if (process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.startsWith('postgresql://') && 
        !process.env.DATABASE_URL.startsWith('postgres://') &&
        !process.env.DATABASE_URL.startsWith('file:')) {
      errors.push('DATABASE_URL must start with postgresql://, postgres://, or file:');
    }
  }

  // Проверка опциональных переменных
  for (const varName of optionalEnvVars) {
    if (!process.env[varName]) {
      warnings.push(`Optional environment variable not set: ${varName}. Some features may be disabled.`);
    }
  }

  // Проверка NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    // В продакшене не должно быть дефолтных значений
    if (process.env.DATABASE_URL?.includes('localhost')) {
      warnings.push('DATABASE_URL points to localhost in production mode');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Проверяет переменные окружения и бросает ошибку если что-то не так
 * Используется при старте приложения
 */
export function requireValidEnv(): void {
  const result = validateEnv();

  // Выводим предупреждения
  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    result.warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

  // Если есть ошибки - не даем запуститься
  if (!result.valid) {
    console.error('❌ Environment validation failed:');
    result.errors.forEach(error => console.error(`   - ${error}`));
    console.error('');
    console.error('Please check your .env file or environment variables.');
    console.error('See .env.example for reference.');
    throw new Error('Invalid environment configuration');
  }

  console.log('✅ Environment validation passed');
}

/**
 * Получает значение переменной окружения с проверкой
 */
export function getEnvVar(name: string, required: boolean = false): string | undefined {
  const value = process.env[name];
  
  if (required && !value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  
  return value;
}

/**
 * Безопасно получает JWT_SECRET
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  if (secret === 'fallback-secret') {
    throw new Error('JWT_SECRET cannot be "fallback-secret"');
  }
  
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  
  return secret;
}

// Запускаем валидацию при импорте в development
if (process.env.NODE_ENV !== 'test') {
  // Не бросаем ошибку при импорте, только логируем
  // Это позволяет Next.js собрать проект
  const result = validateEnv();
  
  if (!result.valid && process.env.NODE_ENV === 'production') {
    // В production требуем валидные переменные
    requireValidEnv();
  }
}

