'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Activity, Clock, Database, Menu, Lock } from 'lucide-react';
import { useUiStore } from '../store/ui.store';

import NotificationCenter from '../components/NotificationCenter';

interface HealthItem {
  name: string;
  status: string;
}

interface TopbarProps {
  tenant: string;
  version: number;
  timestamp: string;
  health: HealthItem[];
}

export default function Topbar({ tenant, version, timestamp, health }: TopbarProps) {
  const pathname = usePathname();
  const { toggleMobileMenu } = useUiStore();

  const hasDown = Array.isArray(health) && health.some((h) => h.status === 'DOWN');
  const hasWarning = Array.isArray(health) && health.some((h) => h.status === 'WARNING');

  let globalStatusColor = 'bg-green-500';
  let globalStatusText = 'Operational';

  if (hasDown) {
    globalStatusColor = 'bg-red-500';
    globalStatusText = 'System Down';
  } else if (hasWarning) {
    globalStatusColor = 'bg-yellow-500';
    globalStatusText = 'Degraded';
  }

  const breadcrumb =
    pathname === '/' || pathname === '/dashboard'
      ? 'Dashboard'
      : pathname.split('/').filter(Boolean).join(' / ').replace(/-/g, ' ');

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 text-gray-600 focus:outline-none"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 font-medium bg-gray-100 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full flex-shrink-0">
          <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 shrink-0" />
          <span className="truncate max-w-[90px] sm:max-w-[140px]">{tenant}</span>
        </div>

        <nav className="hidden sm:flex items-center text-sm text-gray-500 capitalize truncate">
          {breadcrumb}
        </nav>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{timestamp ? new Date(timestamp).toLocaleTimeString() : '—'}</span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4" />
          <span>KOS: v{version}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${globalStatusColor}`}
            />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${globalStatusColor}`} />
          </span>
          <span className="text-sm font-medium text-gray-700 hidden sm:inline">{globalStatusText}</span>
        </div>

        {/* Human Operator Live Notification & Alert Center */}
        <NotificationCenter />

        <button
          onClick={() => {
            localStorage.removeItem('crm_authenticated');
            window.location.reload();
          }}
          title="Cerrar sesión / Bloquear CRM"
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
