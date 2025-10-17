import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const meetings = await prisma.teamMeeting.findMany({
      include: { 
        user: { 
          select: { id: true, name: true, email: true } 
        } 
      }
    });
    
    console.log(`✅ Total team meetings: ${meetings.length}`);
    
    if (meetings.length > 0) {
      console.log('\n📋 Sample meetings:');
      meetings.slice(0, 2).forEach((m, i) => {
        console.log(`\n[${i+1}] ${m.meetingName}`);
        console.log(`    User: ${m.user?.name}`);
        console.log(`    Date: ${m.meetingDate}`);
        
        let attendees = [];
        try {
          attendees = m.attendees ? JSON.parse(m.attendees) : [];
        } catch (e) {
          console.log(`    ⚠️  Attendees parse error: ${e.message}`);
        }
        console.log(`    Attendees: ${attendees.length}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
