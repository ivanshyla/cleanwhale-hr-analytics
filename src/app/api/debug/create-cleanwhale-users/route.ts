import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    // Генерируем хеш пароля
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Реальные сотрудники CleanWhale
    const cleanwhaleUsers = [
      {
        login: 'artem.communication',
        email: 'artem@cleanwhale.pl',
        name: 'Артем (Коммуникация)',
        role: 'OPS_MANAGER',
        city: 'WARSAW',
        salaryGross: 5400,
        salaryNet: null
      },
      {
        login: 'yuliya.hr',
        email: 'yuliya@cleanwhale.pl', 
        name: 'Юлия (Найм)',
        role: 'HIRING_MANAGER',
        city: 'WARSAW',
        salaryGross: 5500,
        salaryNet: null
      },
      {
        login: 'maryana.hr',
        email: 'maryana@cleanwhale.pl',
        name: 'Марьяна (Найм)', 
        role: 'HIRING_MANAGER',
        city: 'WARSAW',
        salaryGross: 4000,
        salaryNet: null
      },
      {
        login: 'viktoriya.communication',
        email: 'viktoriya@cleanwhale.pl',
        name: 'Виктория (Коммуникация)',
        role: 'OPS_MANAGER', 
        city: 'WARSAW',
        salaryGross: 5900,
        salaryNet: null
      },
      {
        login: 'menedzher.lodz',
        email: 'menedzher@cleanwhale.pl',
        name: 'Менеджер Лодзь',
        role: 'MIXED_MANAGER',
        city: 'LODZ',
        salaryGross: 4500,
        salaryNet: null
      },
      {
        login: 'bogdana.krakow',
        email: 'bogdana@cleanwhale.pl',
        name: 'Богдана (Коммуникация)',
        role: 'OPS_MANAGER',
        city: 'KRAKOW',
        salaryGross: 4400,
        salaryNet: null
      },
      {
        login: 'mariya.krakow',
        email: 'mariya@cleanwhale.pl',
        name: 'Мария (Коммуникация)',
        role: 'OPS_MANAGER',
        city: 'KRAKOW', 
        salaryGross: 4400,
        salaryNet: null
      },
      {
        login: 'anastasiya.krakow',
        email: 'anastasiya@cleanwhale.pl',
        name: 'Анастасия (Найм)',
        role: 'HIRING_MANAGER',
        city: 'KRAKOW',
        salaryGross: 4000,
        salaryNet: null
      },
      {
        login: 'artem.wroclaw',
        email: 'artem.wroclaw@cleanwhale.pl',
        name: 'Артем Вроцлав (Коммуникация)',
        role: 'OPS_MANAGER',
        city: 'WROCLAW',
        salaryGross: null,
        salaryNet: null
      },
      {
        login: 'anastasiya.wroclaw',
        email: 'anastasiya.wroclaw@cleanwhale.pl',
        name: 'Анастасия Вроцлав',
        role: 'MIXED_MANAGER',
        city: 'WROCLAW',
        salaryGross: 4600,
        salaryNet: null
      },
      {
        login: 'pavel.poznan',
        email: 'pavel@cleanwhale.pl',
        name: 'Павел (Коммуникация)',
        role: 'OPS_MANAGER',
        city: 'POZNAN',
        salaryGross: 4300,
        salaryNet: null
      }
    ];

    // Создаем пользователей
    for (const user of cleanwhaleUsers) {
      await client.query(`
        INSERT INTO "users" (id, login, password, email, name, role, city, "salaryGross", "salaryNet", "currency", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PLN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (login) DO UPDATE SET 
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          city = EXCLUDED.city,
          "salaryGross" = EXCLUDED."salaryGross",
          "salaryNet" = EXCLUDED."salaryNet",
          "updatedAt" = CURRENT_TIMESTAMP;
      `, [
        crypto.randomUUID(), 
        user.login, 
        hashedPassword, 
        user.email,
        user.name, 
        user.role, 
        user.city,
        user.salaryGross,
        user.salaryNet
      ]);
    }
    
    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Реальные сотрудники CleanWhale созданы!',
      users_count: cleanwhaleUsers.length,
      credentials: 'Все пользователи: пароль 123456',
      users: cleanwhaleUsers.map(u => ({
        login: u.login,
        email: u.email,
        name: u.name,
        role: u.role,
        city: u.city,
        salary: u.salaryGross
      }))
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}
