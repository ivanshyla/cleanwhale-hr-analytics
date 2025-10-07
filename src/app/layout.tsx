import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'CleanWhale Analytics',
  description: 'Аналитическая панель для команды CleanWhale - отслеживание производительности и HR метрик',
  icons: {
    icon: '/cleanwhale-logo.png',
    shortcut: '/cleanwhale-logo.png',
    apple: '/cleanwhale-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}