'use client';

import React from 'react';
import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import MetricCard from '@/components/MetricCard';
import HealthCard from '@/components/HealthCard';
import VersionIndicator from '@/components/ui/VersionIndicator';
import { useBootstrapStore } from '@/store/bootstrap.store';
import { Activity, Database, Users, MessageSquare, Briefcase, Zap, HelpCircle, Shield, Repeat, Clock, CheckCircle, Search, Server, Settings } from 'lucide-react';

export default function DashboardPage() {
  const { data } = useBootstrapStore();

  if (!data) return null;

  const { tenant, dashboard, status, health, stats, timestamp } = data;
  const healthItems = Array.isArray(health) ? health : [];

  return (
    <PageContainer maxWidth="max-w-[1600px]">
      
      {/* Header del Tenant */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              Dashboard
            </h1>
            <VersionIndicator version={dashboard?.knowledgeVersion || data.version} />
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-500">
            <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-mono text-xs truncate max-w-[220px] sm:max-w-none">
              Tenant: {tenant || 'N/A'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5"/> Sincronizado: {timestamp ? new Date(timestamp).toLocaleTimeString() : 'N/A'}
            </span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5"/> Cache: {dashboard?.cacheStatus === 'HIT' || status?.cacheLoaded ? 'Cargado' : 'Miss'}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 w-full sm:w-auto">
          <Link
            href="/business-studio"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
          >
            Abrir Business Studio
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Métricas Principales (Izquierda - 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Métricas Operativas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard title="Contactos" value={stats?.totalContacts || 0} icon={Users} />
              <MetricCard title="Conversaciones" value={stats?.totalConversations || 0} icon={MessageSquare} />
              <MetricCard title="Memoria de Negocio" value={stats?.totalBusinessMemory || 0} icon={Database} />
              <MetricCard title="Tareas" value={stats?.totalTasks || 0} icon={CheckCircle} />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Base de Conocimiento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard title="Productos" value={dashboard?.productCount || 0} icon={Briefcase} />
              <MetricCard title="Servicios" value={dashboard?.serviceCount || 0} icon={Zap} />
              <MetricCard title="FAQs" value={dashboard?.faqCount || 0} icon={HelpCircle} />
              <MetricCard title="Objeciones" value={dashboard?.objectionCount || 0} icon={Shield} />
              <MetricCard title="Seguimientos" value={dashboard?.followUpCount || 0} icon={Repeat} />
            </div>
          </div>

        </div>

        {/* Estado y Acciones Rápidas (Derecha - 1/3) */}
        <div className="space-y-6">
          
          {/* Health de Servicios */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Activity className="w-5 h-5 text-green-600" />
              Health de Servicios
            </h2>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {healthItems.length > 0 ? (
                healthItems.map((h: any) => (
                  <HealthCard key={h.name} name={h.name} status={h.status} />
                ))
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">No hay datos de salud disponibles</div>
              )}
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Acciones Rápidas
            </h2>
            <div className="flex flex-col gap-2">
              <Link href="/business-studio" className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-3">
                <Search className="w-4 h-4 text-gray-400" />
                Explorar Knowledge Base
              </Link>
              <Link href="/crm" className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-3">
                <Users className="w-4 h-4 text-gray-400" />
                Ver Contactos
              </Link>
              <Link href="/conversations" className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                Historial de Conversaciones
              </Link>
              <Link href="/settings" className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-3">
                <Settings className="w-4 h-4 text-gray-400" />
                Configuración del Sistema
              </Link>
            </div>
          </div>

        </div>

      </div>
    </PageContainer>
  );
}
