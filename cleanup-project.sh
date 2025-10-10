#!/bin/bash

# 🧹 Скрипт очистки проекта CleanWhale
# Удаляет временные файлы и папки, которые можно пересоздать

set -e  # Остановка при ошибке

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🧹 Очистка проекта CleanWhale          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# Функция для безопасного удаления
safe_remove() {
    local path=$1
    local description=$2
    local size=$3
    
    if [ -e "$path" ]; then
        echo -e "${YELLOW}Удаляю:${NC} $description ($size)"
        rm -rf "$path"
        echo -e "${GREEN}✓ Удалено${NC}"
    else
        echo -e "${BLUE}⊘ Пропущено:${NC} $description (не найдено)"
    fi
    echo ""
}

# Проверяем размер до очистки
echo -e "${BLUE}Размер проекта ДО очистки:${NC}"
du -sh . 2>/dev/null || echo "Не удалось определить"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Удаляем node_modules
safe_remove "node_modules" "node_modules (npm зависимости)" "~723 MB"

# 2. Удаляем .next
safe_remove ".next" ".next (собранное приложение)" "~287 MB"

# 3. Удаляем локальную БД для разработки
safe_remove "dev.db" "dev.db (локальная БД)" "128 KB"

# 4. Удаляем тестовые скрипты
echo -e "${YELLOW}Удаляю тестовые файлы...${NC}"
rm -f test-*.js test-*.mjs quick-test.js 2>/dev/null || true
echo -e "${GREEN}✓ Тестовые файлы удалены${NC}"
echo ""

# 5. Удаляем временные файлы Next.js
safe_remove ".vercel" ".vercel (временные файлы Vercel)" "несколько KB"

# 6. Удаляем кэши
safe_remove ".turbo" ".turbo (кэш сборки)" "если есть"
safe_remove ".cache" ".cache (временный кэш)" "если есть"

# 7. npm/yarn кэш
if [ -d "node_modules/.cache" ]; then
    safe_remove "node_modules/.cache" "npm кэш" "если есть"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Проверяем размер после очистки
echo -e "${BLUE}Размер проекта ПОСЛЕ очистки:${NC}"
du -sh . 2>/dev/null || echo "Не удалось определить"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Очистка завершена успешно!           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📝 Что дальше:${NC}"
echo ""
echo "Для продолжения разработки выполните:"
echo -e "  ${BLUE}npm install${NC}        # Установит зависимости (3-5 мин)"
echo -e "  ${BLUE}npm run dev${NC}        # Запустит проект"
echo ""
echo "Для деплоя на сервер:"
echo -e "  ${BLUE}./deploy-to-server.sh user@server-ip${NC}"
echo ""
echo -e "${GREEN}Все важные файлы сохранены! ✅${NC}"
echo ""




