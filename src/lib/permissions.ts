import { JWTPayload } from './auth';

// Определение ролей и их разрешений
export enum Permission {
  // Права на просмотр данных
  VIEW_OWN_DATA = 'view_own_data',
  VIEW_ALL_USERS_DATA = 'view_all_users_data',
  VIEW_CITY_DATA = 'view_city_data',
  VIEW_COUNTRY_DATA = 'view_country_data',
  
  // Права на создание данных
  CREATE_OWN_METRICS = 'create_own_metrics',
  CREATE_COUNTRY_REPORTS = 'create_country_reports',
  
  // Права на AI анализ
  GENERATE_PERSONAL_INSIGHTS = 'generate_personal_insights',
  VIEW_ALL_INSIGHTS = 'view_all_insights',
  
  // Права на отчеты
  EXPORT_OWN_REPORTS = 'export_own_reports',
  EXPORT_ALL_REPORTS = 'export_all_reports',
  
  // Права на email уведомления
  SEND_EMAIL_REPORTS = 'send_email_reports',
  
  // Права на интеграции
  MANAGE_INTEGRATIONS = 'manage_integrations',
  
  // Системные права
  MANAGE_USERS = 'manage_users',
  VIEW_SYSTEM_SETTINGS = 'view_system_settings',
}

// Разрешения для каждой роли
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // HR специалист - свои данные + данные своего города
  HR: [
    Permission.VIEW_OWN_DATA,
    Permission.VIEW_CITY_DATA,
    Permission.CREATE_OWN_METRICS,
    Permission.GENERATE_PERSONAL_INSIGHTS,
    Permission.EXPORT_OWN_REPORTS,
  ],
  
  // Операционный специалист - свои данные + данные своего города
  OPERATIONS: [
    Permission.VIEW_OWN_DATA,
    Permission.VIEW_CITY_DATA,
    Permission.CREATE_OWN_METRICS,
    Permission.GENERATE_PERSONAL_INSIGHTS,
    Permission.EXPORT_OWN_REPORTS,
  ],
  
  // Смешанная роль - свои данные + данные своего города
  MIXED: [
    Permission.VIEW_OWN_DATA,
    Permission.VIEW_CITY_DATA,
    Permission.CREATE_OWN_METRICS,
    Permission.GENERATE_PERSONAL_INSIGHTS,
    Permission.EXPORT_OWN_REPORTS,
  ],
  
  // Менеджер по стране - все данные и управление
  COUNTRY_MANAGER: [
    Permission.VIEW_OWN_DATA,
    Permission.VIEW_ALL_USERS_DATA,
    Permission.VIEW_CITY_DATA,
    Permission.VIEW_COUNTRY_DATA,
    Permission.CREATE_OWN_METRICS,
    Permission.CREATE_COUNTRY_REPORTS,
    Permission.GENERATE_PERSONAL_INSIGHTS,
    Permission.VIEW_ALL_INSIGHTS,
    Permission.EXPORT_OWN_REPORTS,
    Permission.EXPORT_ALL_REPORTS,
    Permission.SEND_EMAIL_REPORTS,
    Permission.MANAGE_INTEGRATIONS,
    Permission.MANAGE_USERS, // Менеджеры могут создавать обычных пользователей
  ],
  
  // Администратор - все права
  ADMIN: [
    ...Object.values(Permission),
  ],
};

// Проверка разрешения у пользователя
export function hasPermission(user: JWTPayload, permission: Permission): boolean {
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
}

// Проверка множественных разрешений (И)
export function hasAllPermissions(user: JWTPayload, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(user, permission));
}

// Проверка любого из разрешений (ИЛИ)
export function hasAnyPermission(user: JWTPayload, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

// Проверка доступа к данным другого пользователя
export function canAccessUserData(currentUser: JWTPayload, targetUserId: string): boolean {
  // Всегда можно получить доступ к своим данным
  if (currentUser.userId === targetUserId) {
    return true;
  }
  
  // Только менеджеры по стране и админы могут видеть данные других
  return hasPermission(currentUser, Permission.VIEW_ALL_USERS_DATA);
}

// Проверка доступа к данным по городу
export function canAccessCityData(user: JWTPayload, city: string): boolean {
  // Можно видеть данные своего города
  if (user.city === city) {
    return true;
  }
  
  // Только менеджеры по стране и админы могут видеть данные других городов
  return hasPermission(user, Permission.VIEW_CITY_DATA);
}

// Фильтрация данных на основе прав доступа
export function filterDataByPermissions(user: JWTPayload, data: any[]): any[] {
  // Если пользователь может видеть все данные, возвращаем все
  if (hasPermission(user, Permission.VIEW_ALL_USERS_DATA)) {
    return data;
  }
  
  // Если пользователь может видеть данные по городу, фильтруем по своему городу
  if (hasPermission(user, Permission.VIEW_CITY_DATA)) {
    return data.filter(item => {
      // Проверяем свои данные
      const isOwnData = item.userId === user.userId || 
                       item.user?.id === user.userId ||
                       item.generatedBy === user.userId;
      
      // Проверяем данные по городу
      const isCityData = item.user?.city === user.city ||
                        item.city === user.city;
      
      return isOwnData || isCityData;
    });
  }
  
  // Иначе фильтруем только свои данные
  return data.filter(item => {
    return item.userId === user.userId || 
           item.user?.id === user.userId ||
           item.generatedBy === user.userId;
  });
}

// Middleware для проверки разрешений в API
export function requirePermission(permission: Permission) {
  return (user: JWTPayload): { allowed: true } | { allowed: false; error: Response } => {
    if (hasPermission(user, permission)) {
      return { allowed: true };
    }
    
    return {
      allowed: false,
      error: new Response(
        JSON.stringify({ 
          message: 'Недостаточно прав доступа',
          required_permission: permission,
          user_role: user.role 
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    };
  };
}

// Получение списка разрешений пользователя
export function getUserPermissions(user: JWTPayload): Permission[] {
  return ROLE_PERMISSIONS[user.role] || [];
}

// Проверка, является ли пользователь менеджером
export function isManager(user: JWTPayload): boolean {
  return ['COUNTRY_MANAGER', 'ADMIN'].includes(user.role);
}

// Проверка, является ли пользователь обычным сотрудником
export function isRegularEmployee(user: JWTPayload): boolean {
  return ['HR', 'OPERATIONS', 'MIXED'].includes(user.role);
}

// Получение фильтра для запросов к базе данных на основе прав пользователя
export function getDataFilter(user: JWTPayload): any {
  // Директор по стране и админ видят все данные
  if (hasPermission(user, Permission.VIEW_ALL_USERS_DATA)) {
    return {}; // Нет фильтрации
  }
  
  // Обычные менеджеры видят свои данные + данные своего города
  if (hasPermission(user, Permission.VIEW_CITY_DATA)) {
    return {
      OR: [
        { userId: user.userId }, // Свои данные
        { user: { city: user.city } } // Данные коллег из того же города
      ]
    };
  }
  
  // Только свои данные
  return { userId: user.userId };
}

// Получение разрешенных городов для пользователя
export function getAllowedCities(user: JWTPayload): string[] {
  // Директор по стране и админ видят все города
  if (hasPermission(user, Permission.VIEW_ALL_USERS_DATA)) {
    return ['WARSAW', 'KRAKOW', 'GDANSK', 'WROCLAW', 'POZNAN', 'LODZ', 'LUBLIN', 'KATOWICE', 'BYDGOSZCZ', 'SZCZECIN', 'TORUN', 'RADOM', 'RZESZOW', 'OLSZTYN', 'BIALYSTOK'];
  }
  
  // Обычные менеджеры видят только свой город
  if (hasPermission(user, Permission.VIEW_CITY_DATA)) {
    return [user.city];
  }
  
  // Без прав на просмотр городов
  return [];
}
