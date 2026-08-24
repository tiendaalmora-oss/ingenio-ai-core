'use client';

import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import LoadingScreen from '../components/LoadingScreen';
import { useBootstrapStore } from '../store/bootstrap.store';
import { useUiStore } from '../store/ui.store';
import api from '../services/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, data, error, setBootstrapData, setError } = useBootstrapStore();
  const { sidebarOpen } = useUiStore();

  useEffect(() => {
    if (!isLoaded) {
      api.get('/business-studio/bootstrap')
        .then((res) => {
          if (res.data?.tenant?.id && typeof window !== 'undefined') {
            localStorage.setItem('tenant_id', res.data.tenant.id);
          }
          setBootstrapData(res.data);
        })
        .catch((err) => {
          setError(err);
        });
    }
  }, [isLoaded, setBootstrapData, setError]);

  if (error) {
    throw error;
  }

  if (!isLoaded || !data) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar — fixed, always visible on desktop */}
      <Sidebar menu={data.menu} />

      {/*
        Main wrapper — offset by sidebar width.
        sidebarOpen → 256px (w-64)
        collapsed   → 80px  (w-20)
        The transition must mirror the sidebar's own transition-all.
      */}
      <div
        className={`flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <Topbar
          tenant={data.tenant}
          version={data.version}
          timestamp={data.timestamp}
          health={data.health}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 flex flex-col">
          <div className="flex-1 flex flex-col min-h-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
