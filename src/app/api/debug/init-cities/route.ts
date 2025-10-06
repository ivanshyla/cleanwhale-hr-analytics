export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardDebugEndpoint, logDebugAccess } from '@/lib/debug-guard';

export async function POST(request: NextRequest) {
  const guardError = guardDebugEndpoint();
  if (guardError) return guardError;
  logDebugAccess('/api/debug/init-cities', 'POST');
  
  try {
    console.log('🏙️ Инициализируем города в базе данных...');

    // Список всех городов согласно enum City в schema.prisma
    const cities = [
      { code: 'WARSAW', name: 'Варшава' },
      { code: 'KRAKOW', name: 'Краков' },
      { code: 'WROCLAW', name: 'Вроцлав' },
      { code: 'GDANSK', name: 'Гданьск' },
      { code: 'LODZ', name: 'Лодзь' },
      { code: 'POZNAN', name: 'Познань' },
      { code: 'KATOWICE', name: 'Катовице' },
      { code: 'BIALYSTOK', name: 'Белосток' },
      { code: 'LUBLIN', name: 'Люблин' },
    ];

    const results = [];

    // Используем raw SQL для обхода проблем с типами
    for (const city of cities) {
      // Проверяем, существует ли город
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM cities WHERE code = ${city.code}::"City"
      `;
      
      if (existing.length === 0) {
        // Создаем новый город
        await prisma.$executeRaw`
          INSERT INTO cities (code, name, timezone, "isActive", "createdAt")
          VALUES (${city.code}::"City", ${city.name}, 'Europe/Warsaw', true, NOW())
        `;
        console.log(`✅ Город ${city.name} (${city.code}) - создан`);
      } else {
        // Обновляем существующий
        await prisma.$executeRaw`
          UPDATE cities 
          SET name = ${city.name}, "isActive" = true
          WHERE code = ${city.code}::"City"
        `;
        console.log(`✅ Город ${city.name} (${city.code}) - обновлен`);
      }
      
      results.push({ code: city.code, name: city.name });
    }

    // Проверяем сколько городов в базе
    const count = await prisma.cityInfo.count();

    return NextResponse.json({
      success: true,
      message: 'Города успешно инициализированы',
      cities: results,
      count: count,
    });

  } catch (error) {
    console.error('❌ Ошибка инициализации городов:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Ошибка инициализации городов',
        error: String(error),
      },
      { status: 500 }
    );
  }
}

