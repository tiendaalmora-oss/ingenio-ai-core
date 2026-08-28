'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Activity, Clock, Database } from 'lucide-react';

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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium bg-gray-100 px-3 py-1.5 rounded-full flex-shrink-0">
          <Database className="w-4 h-4 text-gray-500" />
          <span className="truncate max-w-[120px]">{tenant}</span>
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
      </div>
    </header>
  );
}
