'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiStore } from '../store/ui.store';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  MessageSquare,
  Brain,
  BarChart,
  Settings,
  Menu,
  X,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Briefcase,
  Users,
  MessageSquare,
  Brain,
  BarChart,
  Settings,
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
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sortedMenu = [...menu].sort((a, b) => a.order - b.order);
  const sidebarWidth = sidebarOpen ? 'w-64' : 'w-20';

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 ${sidebarWidth}`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
          {sidebarOpen && (
            <span className="text-xl font-bold text-gray-800 truncate">Ingenio AI</span>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 flex-shrink-0"
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
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center p-2 rounded-lg group transition-colors ${
                      !item.enabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                    } ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={!sidebarOpen ? item.title : undefined}
                  >
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        isActive ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-900'
                      }`}
                    />
                    {sidebarOpen && (
                      <span className="ms-3 truncate text-sm font-medium">{item.title}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* ── Mobile hamburger button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow border border-gray-200 text-gray-600"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black bg-opacity-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-64 h-full bg-white border-r border-gray-200 flex flex-col">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <span className="text-xl font-bold text-gray-800">Ingenio AI</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
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
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center p-2 rounded-lg transition-colors ${
                          !item.enabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                        } ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-500'}`} />
                        <span className="ms-3 text-sm font-medium">{item.title}</span>
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
