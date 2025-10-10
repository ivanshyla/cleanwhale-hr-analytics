'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  BarChart3,
  Folder,
  Home,
  Users,
  X as XMarkIcon,
  Menu as MenuIcon,
  Settings,
  Shield,
  LogOut,
  Lightbulb,
  Scale,
  Calendar,
  CalendarDays,
  FileText,
  LineChart,
  Briefcase,
  Building2,
  UserRoundCog,
  User,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Определяем типы ролей
type Role = 'ADMIN' | 'COUNTRY_MANAGER' | 'HIRING_MANAGER' | 'OPS_MANAGER' | 'MIXED_MANAGER';

interface User {
  id: string;
  login: string;
  name: string;
  role: Role;
  city: string;
}

const navigation = [
  { name: 'Дашборд', href: '/dashboard', icon: Home, roles: ['ADMIN', 'COUNTRY_MANAGER', 'HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER'] },
  { name: 'Еженедельный отчет', href: '/dashboard/weekly-report', icon: FileText, roles: ['HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER'] },
  { name: 'Мой график', href: '/dashboard/schedule', icon: CalendarDays, roles: ['HIRING_MANAGER', 'OPS_MANAGER', 'MIXED_MANAGER'] },
  { name: 'Внести данные', href: '/dashboard/country', icon: Building2, roles: ['ADMIN', 'COUNTRY_MANAGER'] },
  { name: 'Графики работы', href: '/dashboard/manager-schedules', icon: Calendar, roles: ['ADMIN', 'COUNTRY_MANAGER'] },
  { name: 'Аналитика', href: '/dashboard/country-analytics', icon: BarChart3, roles: ['ADMIN', 'COUNTRY_MANAGER'] },
  { name: 'Встречи команды', href: '/dashboard/team-meetings', icon: MessageCircle, roles: ['ADMIN', 'COUNTRY_MANAGER'] },
  { name: 'Пользователи', href: '/dashboard/users', icon: Users, roles: ['ADMIN', 'COUNTRY_MANAGER'] },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Получаем данные пользователя из API (по токену в cookie)
    const fetchUser = async () => {
      try {
        console.log('Fetching user data...');
        const response = await fetch('/api/auth/me', {
          cache: 'no-cache', // Принудительно обновляем данные
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        if (response.ok) {
          const data = await response.json();
          console.log('User data received:', data.user);
          setUser(data.user);
        } else {
          console.log('Auth failed, redirecting to login');
          // Невалидный токен - перенаправляем на логин
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('user'); // Clear any residual local storage data
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-lg font-medium text-gray-700">Загрузка...</div>
      </div>
    );
  }

  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(user.role)
  );

  return (
    <>
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                      <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  </Transition.Child>
                  {/* Sidebar component, swap this element with another sidebar if you like */}
                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 ring-1 ring-white/10">
                    <div className="flex h-16 shrink-0 items-center">
                      <Link href="/dashboard">
                        <img
                          className="h-10 w-auto rounded-lg"
                          src="/cleanwhale-logo-big.png"
                          alt="CleanWhale Analytics"
                        />
                      </Link>
                    </div>
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                          <ul role="list" className="-mx-2 space-y-1">
                            {filteredNavigation.map((item) => (
                              <li key={item.name}>
                                <Link
                                  href={item.href}
                                  className="text-gray-400 hover:text-white hover:bg-gray-800 group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                                >
                                  <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                        <li className="mt-auto">
                          <div className="text-gray-400 group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6">
                            <User className="h-6 w-6 shrink-0" aria-hidden="true" />
                            {user.name} ({user.role})
                          </div>
                          <button
                            onClick={handleLogout}
                            className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white w-full text-left"
                          >
                            <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
                            Выйти
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <Link href="/dashboard">
                <img
                  className="h-10 w-auto rounded-lg"
                  src="/cleanwhale-logo-big.png"
                  alt="CleanWhale Analytics"
                />
              </Link>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {filteredNavigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className="text-gray-400 hover:text-white hover:bg-gray-800 group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                        >
                          <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="mt-auto">
                  <div className="text-gray-400 group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6">
                    <User className="h-6 w-6 shrink-0" aria-hidden="true" />
                    {user.name} ({user.role})
                  </div>
                  <button
                    onClick={handleLogout}
                    className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white w-full text-left"
                  >
                    <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
                    Выйти
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="lg:pl-72">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <span className="sr-only">Open sidebar</span>
              <MenuIcon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true" />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="relative flex flex-1">
                {/* Search can go here */}
              </div>
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                {/* Profile dropdown */}
                <div className="relative">
                  {/* User menu can go here */}
                </div>
              </div>
            </div>
          </div>

          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}