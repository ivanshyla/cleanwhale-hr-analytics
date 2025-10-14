import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 🚀 ОПТИМИЗАЦИЯ: Настройки для serverless окружения (Vercel)
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Для serverless важно закрывать неиспользуемые соединения
  // чтобы не исчерпать connection pool
  // https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
});

// Всегда сохраняем в global для переиспользования соединений (особенно важно для serverless)
globalForPrisma.prisma = prisma;

// Добавляем счетчик активных запросов для мониторинга
let activeQueryCount = 0;

// Middleware для мониторинга производительности БД
if (process.env.NODE_ENV !== 'production') {
  prisma.$use(async (params, next) => {
    activeQueryCount++;
    const before = Date.now();
    
    const result = await next(params);
    
    const after = Date.now();
    const duration = after - before;
    
    activeQueryCount--;
    
    // Логируем медленные запросы (>1s)
    if (duration > 1000) {
      console.warn(`🐌 Slow query (${duration}ms):`, {
        model: params.model,
        action: params.action,
        duration: `${duration}ms`,
        activeQueries: activeQueryCount
      });
    }
    
    return result;
  });
}

// Graceful shutdown - закрываем соединения при завершении процесса
if (process.env.NODE_ENV !== 'production') {
  process.on('SIGTERM', async () => {
    console.log('🔌 SIGTERM received, closing Prisma connections...');
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('🔌 SIGINT received, closing Prisma connections...');
    await prisma.$disconnect();
    process.exit(0);
  });
}
