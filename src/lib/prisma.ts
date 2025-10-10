import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Всегда сохраняем в global для переиспользования соединений (особенно важно для serverless)
globalForPrisma.prisma = prisma;

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
