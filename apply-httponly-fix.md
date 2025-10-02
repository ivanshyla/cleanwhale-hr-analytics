# Шаблон для исправления localStorage → httpOnly cookies

## Что менять:

### 1. useEffect для проверки auth:
```typescript
// ❌ БЫЛО:
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) {
    router.push('/login');
    return;
  }
  // ...
}, [router]);

// ✅ СТАЛО:
useEffect(() => {
  const checkAuth = async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      router.push('/login');
      return;
    }
    const userData = await res.json();
    // ... использовать userData
  };
  checkAuth();
}, [router]);
```

### 2. Fetch запросы:
```typescript
// ❌ БЫЛО:
const token = localStorage.getItem('token');
fetch('/api/something', {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify(data),
})

// ✅ СТАЛО:
fetch('/api/something', {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // ← Добавить!
  body: JSON.stringify(data),
})
```

## Файлы для исправления:
- [ ] weekly-question/page.tsx (3 места)
- [ ] team-meetings/page.tsx (3 места)
- [ ] employee-data/page.tsx (4 места)
- [ ] employee-ratings/page.tsx (2 места)
- [ ] external-data/page.tsx (3 места)
- [ ] call-schedule/page.tsx (8 мест!)
- [ ] metrics/new/page.tsx (3 места)
- [ ] comprehensive-analytics/ComprehensiveAnalyticsClient.tsx (3 места)

