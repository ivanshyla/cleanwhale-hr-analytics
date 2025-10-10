'use client';

import { useState } from 'react';

export default function DebugLoginPage() {
  const [login, setLogin] = useState('country_manager');
  const [password, setPassword] = useState('country123');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testLogin = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔍 Отправляем запрос:', { login, password });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login, password }),
        credentials: 'include'
      });

      const data = await response.json();
      
      console.log('📥 Получили ответ:', { status: response.status, data });
      
      setResult({
        status: response.status,
        ok: response.ok,
        data,
        headers: Object.fromEntries(response.headers.entries())
      });

    } catch (error) {
      console.error('❌ Ошибка:', error);
      setResult({
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Login</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Логин:</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Пароль:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <button
            onClick={testLogin}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isLoading ? 'Тестируем...' : 'Тест логина'}
          </button>
        </div>

        {result && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Результат:</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
