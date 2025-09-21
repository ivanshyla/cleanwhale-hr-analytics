import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    message: 'Успешный выход',
    success: true,
  });

  // Удаляем токен из cookies
  response.cookies.delete('token');

  return response;
}
