export const revalidate = 60; // кэш на 60 секунд

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

// GET /api/country-aggregates?weekIso=...
export async function GET(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { getJwtSecret } = require('@/lib/env');
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    const userId = decoded.userId;

    // Проверяем права доступа (COUNTRY_MANAGER или ADMIN)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'COUNTRY_MANAGER'].includes(user.role)) {
      return NextResponse.json({ message: 'Нет доступа к данным по стране' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const weekIso = searchParams.get('weekIso');
    
    if (!weekIso) {
      return NextResponse.json({ message: 'Параметр weekIso обязателен' }, { status: 400 });
    }

    console.log('📊 Fetching country aggregates for week:', weekIso);
    
    // Получаем список всех городов для полной картины
    console.log('1️⃣ Fetching all cities...');
    const allCities = await prisma.cityInfo.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' }
    });
    console.log(`✅ Found ${allCities.length} cities`);

    // Получаем агрегаты по городам
    console.log('2️⃣ Fetching aggregates for week:', weekIso);
    const aggregates = await prisma.countryAggregate.findMany({
      where: { weekIso }
    });
    console.log(`✅ Found ${aggregates.length} aggregates`);

    // Формируем ответ с полным списком городов (заполненные + пустые)
    const response = allCities.map(city => {
      const aggregate = aggregates.find(a => a.cityId === city.id);
      
      return {
        cityId: city.id,
        cityCode: city.code,
        cityName: city.name,
        weekIso,
        trengoResponses: aggregate?.trengoResponses || 0,
        crmComplaintsClosed: aggregate?.crmComplaintsClosed || 0,
        hiredPeople: aggregate?.hiredPeople || 0,
        cityOrders: aggregate?.cityOrders || 0,
        trengoMessages: aggregate?.trengoMessages || 0,
        hiredHR: aggregate?.hiredHR || 0,
        hiredOps: aggregate?.hiredOps || 0,
        hiredMixed: aggregate?.hiredMixed || 0,
        notes: aggregate?.notes || '',
        updatedAt: aggregate?.updatedAt || null
      };
    });

    console.log('📦 Returning country aggregates response:', {
      weekIso,
      citiesCount: response.length
    });

    return NextResponse.json({
      weekIso,
      cities: response
    });

  } catch (error: any) {
    console.error('❌ Error fetching country aggregates:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        message: 'Ошибка получения данных по городам',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/country-aggregates
export async function POST(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { getJwtSecret } = require('@/lib/env');
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    const userId = decoded.userId;

    // Проверяем права доступа (COUNTRY_MANAGER или ADMIN)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'COUNTRY_MANAGER'].includes(user.role)) {
      return NextResponse.json({ message: 'Нет доступа к редактированию данных по стране' }, { status: 403 });
    }

    const body = await request.json();
    const { weekIso, items } = body;

    if (!weekIso || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { message: 'Отсутствуют обязательные поля: weekIso, items[]' },
        { status: 400 }
      );
    }

    console.log('📊 Processing country aggregates:', {
      weekIso,
      itemsCount: items.length,
      firstItem: items[0]
    });

    // Быстрые независимые upsert'ы параллельно (без транзакции)
    const result = await Promise.all(items.map(async (item) => {
      const {
        cityId,
        trengoResponses,
        crmComplaintsClosed,
        hiredPeople,
        cityOrders,
        trengoMessages,
        hiredHR,
        hiredOps,
        hiredMixed,
        notes
      } = item;
      if (!cityId) throw new Error('cityId обязателен для каждого элемента');
      const parsedCityId = typeof cityId === 'string' ? parseInt(cityId) : Number(cityId);
      return prisma.countryAggregate.upsert({
        where: { weekIso_cityId: { weekIso, cityId: parsedCityId } },
        update: {
          trengoResponses: trengoResponses || 0,
          crmComplaintsClosed: crmComplaintsClosed || 0,
          hiredPeople: hiredPeople || 0,
          cityOrders: cityOrders || 0,
          trengoMessages: trengoMessages || 0,
          hiredHR: hiredHR || 0,
          hiredOps: hiredOps || 0,
          hiredMixed: hiredMixed || 0,
          notes: notes || null,
          updatedAt: new Date()
        },
        create: {
          weekIso,
          cityId: parsedCityId,
          trengoResponses: trengoResponses || 0,
          crmComplaintsClosed: crmComplaintsClosed || 0,
          hiredPeople: hiredPeople || 0,
          cityOrders: cityOrders || 0,
          trengoMessages: trengoMessages || 0,
          hiredHR: hiredHR || 0,
          hiredOps: hiredOps || 0,
          hiredMixed: hiredMixed || 0,
          notes: notes || null
        },
        include: { city: true }
      });
    }));

    return NextResponse.json({
      message: 'Данные по городам сохранены',
      weekIso,
      updated: result.length,
      data: result
    });

  } catch (error: any) {
    console.error('❌ Error saving country aggregates:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      clientVersion: error.clientVersion,
    });
    
    // Обработка специфичных ошибок Prisma
    if (error.code === 'P2003') {
      return NextResponse.json(
        { 
          message: 'Ошибка: город не найден в системе',
          error: 'Foreign key constraint failed - invalid cityId'
        },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { 
          message: 'Ошибка: данные за эту неделю для этого города уже существуют',
          error: 'Duplicate entry'
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        message: 'Ошибка сохранения данных по городам',
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          meta: error.meta
        } : undefined
      },
      { status: 500 }
    );
  }
}