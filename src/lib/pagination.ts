/**
 * Утилиты для пагинации API
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Парсит параметры пагинации из URL
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults: { page: number; limit: number } = { page: 1, limit: 50 }
): { page: number; limit: number; skip: number; take: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || String(defaults.page)));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(defaults.limit))));
  
  const skip = (page - 1) * limit;
  const take = limit;

  return { page, limit, skip, take };
}

/**
 * Создает мета-данные пагинации
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Создает paginированный ответ
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    meta: createPaginationMeta(page, limit, total),
  };
}

/**
 * Валидирует параметры курсорной пагинации
 */
export interface CursorParams {
  cursor?: string;
  limit?: number;
}

export function parseCursorParams(
  searchParams: URLSearchParams,
  defaultLimit: number = 50
): { cursor: string | undefined; limit: number } {
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit))));
  
  return { cursor, limit };
}

