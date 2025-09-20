const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('Attempting to connect to the database...');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    console.log('Attempting to fetch users...');
    const userCount = await prisma.user.count();
    console.log(`✅ Successfully fetched data. User count: ${userCount}`);
    
  } catch (error) {
    console.error('❌ Failed to connect or fetch data from the database.');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected from the database.');
  }
}

main();
