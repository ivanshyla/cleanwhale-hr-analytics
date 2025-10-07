#!/bin/bash

echo "🔧 Автоматическое исправление критических проблем"
echo "=================================================="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Счетчики
FIXED=0
ERRORS=0

echo "📋 План исправлений:"
echo "1. Добавить dynamic export во все API routes"
echo "2. Обновить .gitignore"
echo "3. Защитить debug endpoints"
echo "4. Создать backup перед изменениями"
echo ""
read -p "Продолжить? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Отменено пользователем"
    exit 1
fi

# Создаем резервную копию
echo "📦 Создаю backup..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r src/app/api "$BACKUP_DIR/"
echo "✅ Backup создан в $BACKUP_DIR"
echo ""

# 1. Исправление API routes - добавление dynamic export
echo "🔧 Исправление 1: Добавление dynamic export в API routes"
echo "-----------------------------------------------------"

# Находим все route.ts файлы
find src/app/api -name "route.ts" -type f | while read file; do
  # Проверяем, не добавлено ли уже
  if ! grep -q "export const dynamic" "$file"; then
    echo "  Обрабатываю: $file"
    
    # Добавляем в начало файла
    cat > "${file}.tmp" << 'EOF'
export const dynamic = 'force-dynamic';

EOF
    cat "$file" >> "${file}.tmp"
    mv "${file}.tmp" "$file"
    
    echo -e "  ${GREEN}✓${NC} Добавлен dynamic export"
    ((FIXED++))
  else
    echo "  ⊘ Пропускаю: $file (уже исправлен)"
  fi
done

echo ""
echo "✅ Исправлено файлов: $FIXED"
echo ""

# 2. Обновление .gitignore
echo "🔧 Исправление 2: Обновление .gitignore"
echo "-------------------------------------"

if [ -f ".gitignore.additions" ]; then
  # Проверяем, не добавлено ли уже
  if ! grep -q "quick-test.js" .gitignore; then
    echo "  Добавляю файлы с credentials в .gitignore..."
    cat >> .gitignore << 'EOF'

# Test files with credentials (added by security audit)
quick-test.js
test-supabase.js
test-db.js
vercel-env.txt
add-openai-key.sh
EOF
    echo -e "  ${GREEN}✓${NC} .gitignore обновлен"
  else
    echo "  ⊘ .gitignore уже содержит нужные записи"
  fi
else
  echo -e "  ${YELLOW}⚠${NC} Файл .gitignore.additions не найден"
fi

echo ""

# 3. Защита debug endpoints
echo "🔧 Исправление 3: Защита debug endpoints"
echo "--------------------------------------"

DEBUG_PROTECTION='  if (process.env.NODE_ENV === '\''production'\'') {
    return NextResponse.json(
      { error: '\''Debug endpoints are not available in production'\'' },
      { status: 403 }
    );
  }

'

PROTECTED=0
find src/app/api/debug -name "route.ts" -type f | while read file; do
  # Проверяем, не защищено ли уже
  if ! grep -q "NODE_ENV === 'production'" "$file"; then
    echo "  Защищаю: $file"
    
    # Находим первую функцию export и добавляем проверку после {
    # Это упрощенная версия, для более сложных случаев нужноручное исправление
    
    echo -e "  ${YELLOW}⚠${NC} Требуется ручное исправление для $file"
    echo "     Добавьте в начало функции:"
    echo "     if (process.env.NODE_ENV === 'production') {"
    echo "       return NextResponse.json({ error: 'Not available' }, { status: 403 });"
    echo "     }"
    
  else
    echo "  ⊘ Пропускаю: $file (уже защищен)"
  fi
done

echo ""

# Итоги
echo "=================================================="
echo "✅ АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО"
echo "=================================================="
echo ""
echo "Что было сделано:"
echo "  ✓ Добавлен dynamic export в API routes"
echo "  ✓ Обновлен .gitignore"
echo "  ⚠ Debug endpoints требуют ручного исправления"
echo ""
echo "⚠️  ВАЖНО: Необходимы РУЧНЫЕ действия:"
echo ""
echo "1. 🔐 СМЕНИТЬ пароли:"
echo "   - Supabase: смените пароль в Dashboard"
echo "   - JWT_SECRET: сгенерируйте новый ключ"
echo "   Команда: openssl rand -base64 32"
echo ""
echo "2. 🗑️  УДАЛИТЬ файлы с credentials:"
echo "   git rm quick-test.js test-supabase.js vercel-env.txt"
echo "   git commit -m 'Remove credentials from repository'"
echo ""
echo "3. 🧪 ПРОВЕРИТЬ сборку:"
echo "   npm run build"
echo ""
echo "4. 📝 ОБНОВИТЬ environment variables:"
echo "   - В Vercel Dashboard"
echo "   - В локальном .env"
echo ""
echo "5. 🔍 ПРОЧИТАТЬ:"
echo "   - SECURITY_AUDIT.md"
echo "   - READINESS_REPORT.md"
echo "   - FIX_BUILD_ERRORS.md"
echo ""
echo "Backup сохранен в: $BACKUP_DIR"
echo ""
echo "Следующий шаг: npm run build"

