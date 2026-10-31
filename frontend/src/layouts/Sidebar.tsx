'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiStore } from '../store/ui.store';
import {
  LayoutDashboard,
  BadgeDollarSign,
  Briefcase,
  Users,
  MessageSquare,
  Brain,
  BarChart,
  Settings,
  Menu,
  X,
  Building2,
  LogOut,
  Megaphone,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  BadgeDollarSign,
  Briefcase,
  Users,
  MessageSquare,
  Brain,
  BarChart,
  Settings,
  Building2,
  Megaphone,
};

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  route: string;
  enabled: boolean;
  order: number;
}

export default function Sidebar({ menu }: { menu: MenuItem[] }) {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUiStore();
  const { role, logout } = useAuthStore();
  const isClient = role === 'client' || (typeof window !== 'undefined' && localStorage.getItem('user_role') === 'client');

  const sortedMenu = [...menu].sort((a, b) => a.order - b.order);
  const sidebarWidth = sidebarOpen ? 'w-64' : 'w-20';

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 z-40 h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 ${sidebarWidth}`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-slate-800 flex-shrink-0">
          {sidebarOpen ? (
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
              <img src="/logo-horizontal-dark.png" alt="IngenioCRM" className="hidden dark:block h-8 w-auto object-contain" />
              <img src="/logo-horizontal-light.png" alt="IngenioCRM" className="block dark:hidden h-8 w-auto object-contain" />
            </Link>
          ) : (
            <Link href="/dashboard" className="flex items-center justify-center p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition" title="IngenioCRM">
              <img src="/icon-mark.png" alt="IngenioCRM" className="h-7 w-auto object-contain" />
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {sortedMenu.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive =
                pathname === item.route || pathname.startsWith(item.route + '/');

              return (
                <li key={item.id}>
                  <Link
                    href={item.enabled ? item.route : '#'}
                    className={`flex items-center p-2 rounded-lg group transition-colors ${
                      !item.enabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                    } ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title={!sidebarOpen ? item.title : undefined}
                  >
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-white'
                      }`}
                    />
                    {sidebarOpen && (
                      <span className="ms-3 truncate text-sm font-medium">{item.title}</span>
                    )}
                  </Link>
                </li>
              );
            })}

            {/* ── Ítem fijo: Panel de Agencia (solo para administradores) ── */}
            {!isClient && (
              <li className="pt-2 mt-2 border-t border-gray-100 dark:border-slate-800">
                <Link
                  href="/agency"
                  className={`flex items-center p-2 rounded-lg group transition-colors ${
                    pathname === '/agency' || pathname.startsWith('/agency/')
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={!sidebarOpen ? 'Panel de Agencia' : undefined}
                >
                  <Building2
                    className={`w-5 h-5 flex-shrink-0 ${
                      pathname.startsWith('/agency') ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-white'
                    }`}
                  />
                  {sidebarOpen && (
                    <span className="ms-3 truncate text-sm font-medium">Panel de Agencia</span>
                  )}
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* ── Footer / Logout ── */}
        <div className="p-3 border-t border-gray-200 dark:border-slate-800">
          <button
            onClick={() => {
              logout();
              window.location.href = '/';
            }}
            className="w-full flex items-center p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-xs font-medium"
            title={!sidebarOpen ? 'Cerrar Sesión' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span className="ms-3 truncate">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200 border-r border-transparent dark:border-slate-800">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-slate-800">
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center">
                <img src="/logo-horizontal-dark.png" alt="IngenioCRM" className="hidden dark:block h-8 w-auto object-contain" />
                <img src="/logo-horizontal-light.png" alt="IngenioCRM" className="block dark:hidden h-8 w-auto object-contain" />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 overflow-y-auto">
              <ul className="space-y-1 px-3">
                {sortedMenu.map((item) => {
                  const Icon = iconMap[item.icon] || LayoutDashboard;
                  const isActive =
                    pathname === item.route || pathname.startsWith(item.route + '/');
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.enabled ? item.route : '#'}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center p-3 rounded-xl transition-colors ${
                          !item.enabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                        } ${
                          isActive
                            ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20'
                            : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 dark:text-slate-400'}`} />
                        <span className="ms-3 text-sm">{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
