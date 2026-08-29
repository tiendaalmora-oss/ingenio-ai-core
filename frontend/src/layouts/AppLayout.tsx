'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import LoadingScreen from '../components/LoadingScreen';
import LoginScreen from '../components/LoginScreen';
import { useBootstrapStore } from '../store/bootstrap.store';
import { useUiStore } from '../store/ui.store';
import api from '../services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, data, error, setBootstrapData, setError } = useBootstrapStore();
  const { sidebarOpen } = useUiStore();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // 1. Check initial auth state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem('crm_authenticated') === 'true';
      setIsAuthenticated(isAuth);
    }
  }, []);

  // 2. Fetch Bootstrap data
  const loadBootstrap = useCallback(() => {
    setError(null as any);
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
  }, [setBootstrapData, setError]);

  useEffect(() => {
    if (isAuthenticated && !isLoaded) {
      loadBootstrap();
    }
  }, [isAuthenticated, isLoaded, loadBootstrap]);

  // Loading state while checking localStorage
  if (isAuthenticated === null) {
    return <LoadingScreen />;
  }

  // Not authenticated -> Show login screen
  if (!isAuthenticated) {
    return <LoginScreen onSuccess={() => {
      setIsAuthenticated(true);
      loadBootstrap();
    }} />;
  }

  // Error fetching bootstrap
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-2xl border border-slate-100">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error de Conexión con el Backend</h2>
          <p className="text-sm text-slate-500 mb-6">
            No pudimos conectar con el servidor central de Ingenio AI ({api.defaults.baseURL || 'https://core.ai.ingeniodigital.shop'}).
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                localStorage.removeItem('crm_authenticated');
                setIsAuthenticated(false);
              }}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
            >
              Cambiar Clave
            </button>
            <button
              onClick={() => loadBootstrap()}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
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
