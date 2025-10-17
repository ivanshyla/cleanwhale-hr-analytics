import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const meetings = await prisma.teamMeeting.findMany();
    const users = await prisma.user.findMany({ select: { id: true } });
    const validUserIds = new Set(users.map(u => u.id));
    
    console.log(`📊 Total meetings: ${meetings.length}`);
    console.log(`👥 Valid user IDs: ${validUserIds.size}`);
    
    const orphans = meetings.filter(m => !validUserIds.has(m.userId));
    console.log(`\n⚠️  Orphaned meetings (userId not in User table): ${orphans.length}`);
    
    orphans.forEach(m => {
      console.log(`  - ID: ${m.id}, userId: ${m.userId}, name: ${m.meetingName}`);
    });
    
    // Пытаемся удалить orphans
    if (orphans.length > 0) {
      console.log(`\n🗑️  Удаляем orphan записи...`);
      const result = await prisma.teamMeeting.deleteMany({
        where: { userId: { notIn: Array.from(validUserIds) } }
      });
      console.log(`✅ Удалено: ${result.count} записей`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
