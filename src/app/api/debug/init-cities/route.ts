export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { City } from '@prisma/client';
import { guardDebugEndpoint, logDebugAccess } from '@/lib/debug-guard';

export async function POST(request: NextRequest) {
  const guardError = guardDebugEndpoint();
  if (guardError) return guardError;
  logDebugAccess('/api/debug/init-cities', 'POST');
  
  try {
    console.log('🏙️ Инициализируем города в базе данных...');

    // Список всех городов согласно enum City в schema.prisma
    const cities: Array<{ code: City, name: string }> = [
      { code: City.WARSAW, name: 'Варшава' },
      { code: City.KRAKOW, name: 'Краков' },
      { code: City.WROCLAW, name: 'Вроцлав' },
      { code: City.GDANSK, name: 'Гданьск' },
      { code: City.LODZ, name: 'Лодзь' },
      { code: City.POZNAN, name: 'Познань' },
      { code: City.KATOWICE, name: 'Катовице' },
      { code: City.BIALYSTOK, name: 'Белосток' },
      { code: City.LUBLIN, name: 'Люблин' },
    ];

    const results = [];

    // Используем Prisma ORM для создания городов
    for (const city of cities) {
      try {
        // Пробуем найти существующий город
        const existing = await prisma.cityInfo.findFirst({
          where: { code: city.code }
        });
        
        if (existing) {
          // Обновляем
          await prisma.cityInfo.update({
            where: { id: existing.id },
            data: {
              name: city.name,
              isActive: true
            }
          });
          console.log(`✅ Город ${city.name} (${city.code}) - обновлен (id: ${existing.id})`);
          results.push({ code: String(city.code), name: city.name, id: existing.id });
        } else {
          // Создаем новый
          const created = await prisma.cityInfo.create({
            data: {
              code: city.code,
              name: city.name,
              timezone: 'Europe/Warsaw',
              isActive: true
            }
          });
          console.log(`✅ Город ${city.name} (${city.code}) - создан (id: ${created.id})`);
          results.push({ code: String(city.code), name: city.name, id: created.id });
        }
      } catch (cityError: any) {
        console.error(`❌ Ошибка для города ${city.name}:`, cityError.message);
        console.error('Полная ошибка:', cityError);
        // Продолжаем даже если один город не удалось создать
      }
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

