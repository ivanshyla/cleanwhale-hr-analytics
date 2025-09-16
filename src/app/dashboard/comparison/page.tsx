'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ComparisonPage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={() => router.push('/dashboard')}
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img 
                src="/cleanwhale-logo.png" 
                alt="CleanWhale" 
                className="h-10 w-10 rounded-lg mr-3"
              />
              <div className="text-left">
                <span className="text-xl font-bold cw-text-primary">CleanWhale Analytics</span>
                <p className="text-xs text-gray-600">Сравнение юнитов</p>
              </div>
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Сравнение юнитов</h1>
        <p className="text-gray-600 mb-6">
          Здесь можно сравнивать людей, города и позиции по ключевым метрикам найма
        </p>
        
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">В разработке</h2>
          <p className="text-gray-600">
            Страница сравнения юнитов скоро будет готова! 
            Здесь вы сможете сравнивать производительность отдельных людей, городов и позиций.
          </p>
        </div>
      </main>
    </div>
  );
}
