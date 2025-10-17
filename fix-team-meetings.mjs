import fs from 'fs';

const filePath = 'src/app/api/team-meetings/route.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Заменяем блок создания встречи на версию с предварительной проверкой пользователя
const oldCreate = `    // Используем userId из JWT payload
    const meeting = await prisma.teamMeeting.create({
      data: {
        userId: user.userId,  // userId из JWT токена`;

const newCreate = `    // Проверяем что пользователь существует перед созданием встречи
    console.log('📝 Creating meeting for userId:', user.userId);
    const existingUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true }
    });

    if (!existingUser) {
      console.error('❌ User not found:', user.userId);
      return NextResponse.json(
        { message: 'Ошибка: ваш профиль не найден в системе' },
        { status: 400 }
      );
    }

    // Используем userId из JWT payload
    const meeting = await prisma.teamMeeting.create({
      data: {
        userId: user.userId,  // userId из JWT токена`;

content = content.replace(oldCreate, newCreate);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed team-meetings.ts - added user verification');
