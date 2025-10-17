import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('📊 Checking team_meetings table...\n');
    
    const meetings = await prisma.teamMeeting.findMany({
      take: 5
    });
    
    console.log(`✅ Found ${meetings.length} meetings\n`);
    
    if (meetings.length > 0) {
      console.log('Sample meeting:');
      console.log(JSON.stringify(meetings[0], null, 2));
    } else {
      console.log('ℹ️  No meetings in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

main();
