import Link from 'next/link';
import { ArrowRight, BarChart3, Users, TrendingUp } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img 
                src="/cleanwhale-logo.png" 
                alt="CleanWhale" 
                className="h-10 w-10 rounded-lg mr-3"
              />
              <div>
                <span className="text-xl font-bold cw-text-primary">
                  CleanWhale Analytics
                </span>
                <p className="text-xs text-gray-600">Панель управления командой</p>
              </div>
            </Link>
            <div className="flex space-x-4">
              <Link
                href="/login"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Войти
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              CleanWhale 
              <span className="cw-text-primary"> Analytics</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Централизованная система управления командой CleanWhale - 
              отслеживание производительности, планирование графиков и аналитика по всем городам.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link
                  href="/login"
                  className="cw-button w-full flex items-center justify-center text-base font-medium md:py-4 md:text-lg md:px-10"
                >
                  Войти в CleanWhale Analytics
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Основные действия для линейных менеджеров */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
            <Link
              href="/dashboard/weekly-report"
              className="bg-white rounded-lg shadow-md p-6 border hover:border-blue-300 transition-colors"
            >
              <h3 className="text-lg font-medium text-gray-900">Внести данные</h3>
              <p className="mt-2 text-base text-gray-500">Перейти к еженедельному отчёту</p>
            </Link>
            <Link
              href="/dashboard/schedule"
              className="bg-white rounded-lg shadow-md p-6 border hover:border-blue-300 transition-colors"
            >
              <h3 className="text-lg font-medium text-gray-900">Мой график</h3>
              <p className="mt-2 text-base text-gray-500">Просмотр и редактирование шаблона недели</p>
            </Link>
          </div>

          {/* CTA Section */}
          <div className="mt-16 bg-blue-50 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">
                Готовы начать?
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Войдите в систему для доступа к дашборду аналитики
              </p>
              <div className="mt-6">
                <Link
                  href="/login"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Войти в систему
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2024 HR Analytics Dashboard. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}