# 🔧 Ошибки типов TypeScript для исправления

## Статус: ⚠️ В ПРОЦЕССЕ

При включении `typescript: { ignoreBuildErrors: false }` обнаружены следующие ошибки типов:

---

## ✅ ИСПРАВЛЕНО

### 1. src/app/api/ai-chat/route.ts:58
**Ошибка**: `Property 'id' does not exist on type 'JWTPayload'`
**Исправлено**: Использован `user.userId` вместо `user.id`

### 2. src/app/api/ai-chat/route.ts:85
**Ошибка**: `'weekIso' does not exist in type 'CountryManagerDataWhereInput'`
**Исправлено**: Использован `weekNumber` вместо `weekIso`

### 3. src/app/api/ai-chat/route.ts:90
**Ошибка**: `'weekIso' does not exist in orderBy`
**Исправлено**: Использован `weekNumber` для сортировки

### 4. src/app/api/ai-chat/route.ts:100
**Ошибка**: `Property 'name' does not exist on type 'JWTPayload'`
**Исправлено**: Использован `user.login` вместо `user.name`

### 5. src/app/api/ai-chat/route.ts:116
**Ошибка**: `Property 'registered' does not exist on type HrMetrics`
**Исправлено**: Использован `registrations` (правильное имя из схемы)

---

## ❌ ТРЕБУЮТ ИСПРАВЛЕНИЯ

### 6. src/app/api/ai-chat/route.ts - остальные weekIso в CountryManagerData
**Проблема**: В схеме `CountryManagerData` нет поля `weekIso`, есть `weekNumber`
**Места**:
- Контекст для AI (строка ~135+)
- Обработка countryData

**Решение**: Заменить все обращения к `weekIso` на `weekNumber` или использовать reportDate

---

## 📋 ПОЧЕМУ ЭТО ВАЖНО

Включение TypeScript проверок помогает:
- ✅ Находить ошибки на этапе компиляции, а не в runtime
- ✅ Улучшить автокомплит в IDE
- ✅ Предотвратить баги при рефакторинге
- ✅ Повысить надежность кода

---

## 🎯 ПЛАН ДЕЙСТВИЙ

1. **Исправить оставшиеся ошибки в ai-chat/route.ts**
   - Заменить все `weekIso` на `weekNumber` в работе с CountryManagerData
   - Проверить другие файлы на аналогичные проблемы

2. **Проверить другие API routes**
   - country-weekly-report/route.ts (там тоже есть CountryManagerData)
   - Любые другие файлы использующие JWTPayload.name или .id

3. **Включить проверки**
   ```javascript
   // next.config.mjs
   typescript: {
     ignoreBuildErrors: false,
   },
   ```

4. **Запустить полную сборку**
   ```bash
   npm run build
   ```

---

## 🔍 КАК НАЙТИ ОШИБКИ

```bash
# Полная проверка типов
npx tsc --noEmit

# Сборка с включенными проверками
npm run build

# Поиск потенциальных проблем
grep -r "\.id" src/app/api --include="*.ts"  # Ищем использование user.id
grep -r "\.name" src/app/api --include="*.ts"  # Ищем использование user.name
grep -r "weekIso.*CountryManagerData" src --include="*.ts"  # Ищем weekIso в CountryManagerData
```

---

## 📝 ПРИМЕЧАНИЯ

- JWTPayload содержит: `userId, login, role, city, iat, exp`
- CountryManagerData содержит: `weekNumber, reportDate` (НЕТ weekIso)
- HrMetrics содержит: `registrations, difficultCases` (НЕТ registered, difficult)

---

**Обновлено**: 3 октября 2025  
**Прогресс**: 5/6 ошибок исправлено (83%)


