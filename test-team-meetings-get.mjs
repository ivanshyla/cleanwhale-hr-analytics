import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const meetings = await prisma.teamMeeting.findMany({
      take: 3,
      include: { user: { select: { id: true, name: true } } }
    });
    
    console.log('✅ Raw team meetings from DB:');
    meetings.forEach((m, i) => {
      console.log(`\n[${i}] ID: ${m.id}`);
      console.log(`    userId: ${m.userId}`);
      console.log(`    meetingName: ${m.meetingName}`);
      console.log(`    attendees (raw): ${m.attendees}`);
      console.log(`    attendeeNames (raw): ${m.attendeeNames}`);
      
      // Пробуем парсить
      try {
        const attendees = m.attendees ? JSON.parse(m.attendees) : [];
        console.log(`    attendees (parsed): ${JSON.stringify(attendees)}`);
      } catch (e) {
        console.log(`    ❌ Error parsing attendees: ${e.message}`);
      }
      
      try {
        const names = m.attendeeNames ? JSON.parse(m.attendeeNames) : [];
        console.log(`    attendeeNames (parsed): ${JSON.stringify(names)}`);
      } catch (e) {
        console.log(`    ❌ Error parsing attendeeNames: ${e.message}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
