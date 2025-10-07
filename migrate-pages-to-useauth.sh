#!/bin/bash

# Утилита для автоматической миграции страниц на useAuth()

echo "🚀 Миграция страниц на useAuth()..."
echo ""

# Список страниц для миграции
PAGES=(
  "src/app/dashboard/users/page.tsx"
  "src/app/dashboard/manager-stats/page.tsx"
  "src/app/dashboard/schedule/page.tsx"
  "src/app/dashboard/country/page.tsx"
  "src/app/dashboard/team-meetings/page.tsx"
  "src/app/dashboard/call-schedule/page.tsx"
  "src/app/dashboard/weekly-report/page.tsx"
  "src/app/dashboard/manager-schedules/page.tsx"
  "src/app/dashboard/weekly-question/page.tsx"
  "src/app/dashboard/external-data/page.tsx"
  "src/app/dashboard/analytics/page.tsx"
  "src/app/dashboard/country-report/page.tsx"
  "src/app/dashboard/country-weekly/page.tsx"
  "src/app/dashboard/metrics/new/page.tsx"
  "src/app/dashboard/comprehensive-analytics/ComprehensiveAnalyticsClient.tsx"
)

MIGRATED=0
TOTAL=${#PAGES[@]}

for PAGE in "${PAGES[@]}"; do
  if [ -f "$PAGE" ]; then
    echo "📄 Проверяем: $PAGE"
    
    # Проверяем есть ли уже useAuth
    if grep -q "useAuth" "$PAGE"; then
      echo "  ✅ Уже мигрирован"
    elif grep -q "checkAuth\|fetch.*auth/me" "$PAGE"; then
      echo "  ⚠️ Требует миграции (найден checkAuth или fetch auth/me)"
      MIGRATED=$((MIGRATED + 1))
    else
      echo "  ℹ️ Не требует миграции"
    fi
    echo ""
  fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Статистика:"
echo "  Всего страниц: $TOTAL"
echo "  Требуют миграции: $MIGRATED"
echo "  ✅ Уже мигрировано: $((TOTAL - MIGRATED))"
echo ""
echo "💡 Для миграции используйте pattern из:"
echo "   - src/app/dashboard/country-analytics/page.tsx (✅ готово)"
echo "   - src/app/dashboard/page.tsx (✅ готово)"
echo ""
echo "📖 См. ARCHITECTURE_FIX_GUIDE.md для деталей"

