export const revalidate = 60; // кэш на 60 секунд

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { canAccessCountryFeatures } from '@/lib/permissions';

// GET /api/country-user-inputs?weekIso=YYYY-Www&cityId=<optional>
export async function GET(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { getJwtSecret } = require('@/lib/env');
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    // Проверяем доступ к Country Manager функциям
    if (!canAccessCountryFeatures(decoded)) {
      return NextResponse.json({ message: 'Нет доступа к данным менеджеров' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const weekIso = searchParams.get('weekIso');
    const cityId = searchParams.get('cityId');
    
    if (!weekIso) {
      return NextResponse.json({ message: 'Параметр weekIso обязателен' }, { status: 400 });
    }

    // Получаем всех менеджеров (HR, OPS, MIXED) с возможностью фильтрации по городу
    const whereClause: any = {
      role: { in: ['HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER'] },
      isActive: true
    };

    if (cityId) {
      whereClause.city = cityId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        role: true
      },
      orderBy: [
        { city: 'asc' },
        { name: 'asc' }
      ]
    });

    // Получаем существующие записи для этих пользователей за неделю
    const existingInputs = await prisma.countryUserInput.findMany({
      where: {
        weekIso,
        userId: { in: users.map(u => u.id) }
      }
    });

    // Формируем ответ с данными пользователей и их вводами
    const response = users.map(user => {
      const input = existingInputs.find(i => i.userId === user.id);
      
      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userCity: user.city,
        userRole: user.role,
        weekIso,
        trengoResponses: input?.trengoResponses || 0,
        trengoTickets: input?.trengoTickets || 0,
        crmComplaintsClosed: input?.crmComplaintsClosed || 0,
        ordersHandled: input?.ordersHandled || 0,
        notes: input?.notes || '',
        hasCountryData: !!input
      };
    });

    return NextResponse.json({
      weekIso,
      users: response,
      total: response.length
    });

  } catch (error) {
    console.error('Error fetching country user inputs:', error);
    return NextResponse.json(
      { message: 'Ошибка получения данных по менеджерам' },
      { status: 500 }
    );
  }
}

// POST /api/country-user-inputs
export async function POST(request: NextRequest) {
  try {
    // Проверяем токен
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { getJwtSecret } = require('@/lib/env');
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    // Проверяем доступ к Country Manager функциям
    if (!canAccessCountryFeatures(decoded)) {
      return NextResponse.json({ message: 'Нет доступа к редактированию данных менеджеров' }, { status: 403 });
    }

    const body = await request.json();
    const { weekIso, items } = body;

    if (!weekIso || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { message: 'Отсутствуют обязательные поля: weekIso, items[]' },
        { status: 400 }
      );
    }

    // Используем транзакцию для атомарного обновления
    const result = await prisma.$transaction(async (tx) => {
      const upsertResults = [];

      for (const item of items) {
        const {
          userId,
          trengoResponses,
          trengoTickets,
          crmComplaintsClosed,
          ordersHandled,
          notes
        } = item;

        if (!userId) {
          throw new Error('userId обязателен для каждого элемента');
        }

        const upserted = await tx.countryUserInput.upsert({
          where: {
            weekIso_userId: {
              weekIso,
              userId
            }
          },
          update: {
            trengoResponses: trengoResponses || 0,
            trengoTickets: trengoTickets || 0,
            crmComplaintsClosed: crmComplaintsClosed || 0,
            ordersHandled: ordersHandled || 0,
            notes: notes || null,
            updatedAt: new Date()
          },
          create: {
            weekIso,
            userId,
            trengoResponses: trengoResponses || 0,
            trengoTickets: trengoTickets || 0,
            crmComplaintsClosed: crmComplaintsClosed || 0,
            ordersHandled: ordersHandled || 0,
            notes: notes || null
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                city: true,
                role: true
              }
            }
          }
        });

        upsertResults.push(upserted);
      }

      return upsertResults;
    });

    return NextResponse.json({
      message: 'Данные по менеджерам сохранены',
      weekIso,
      updated: result.length,
      data: result
    });

  } catch (error) {
    console.error('Error saving country user inputs:', error);
    return NextResponse.json(
      { message: 'Ошибка сохранения данных по менеджерам' },
      { status: 500 }
    );
  }
}