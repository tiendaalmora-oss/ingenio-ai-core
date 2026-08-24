'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { Brain, RefreshCw, Sparkles, User, Search, History } from 'lucide-react';
import Link from 'next/link';

export default function MemoryPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['memory-timeline', search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('limit', '30');

      const res = await api.get(`/memory/timeline?${params.toString()}`);
      return res.data;
    },
    refetchOnWindowFocus: false,
  });

  const logs = data?.data || [];

  return (
    <PageContainer maxWidth="max-w-6xl">
      <PageHeader
        title="Memoria de Negocio & Auditoría de IA"
        description="Registro cronológico de aprendizajes, cambios en perfiles de prospectos y extracciones realizadas por Hermes."
        actions={
          <div className="flex gap-2">
            <Link
              href="/business-studio"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition"
            >
              <Brain className="w-3.5 h-3.5" />
              Editar Knowledge Base
            </Link>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </button>
          </div>
        }
      />

      {/* Filter / Search Bar */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por contacto, campo o valor extraído..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <LoadingSkeleton rows={6} />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              title="Sin registros de memoria aún"
              description="A medida que los clientes interactúen con el bot por WhatsApp o redes, Hermes irá extrayendo intereses, objeciones y datos comerciales automáticamente."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Contacto</th>
                  <th className="px-5 py-3.5">Campo Detectado</th>
                  <th className="px-5 py-3.5">Valor Previo</th>
                  <th className="px-5 py-3.5">Nuevo Valor</th>
                  <th className="px-5 py-3.5">Origen / Skill</th>
                  <th className="px-5 py-3.5 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-5 py-3.5 font-medium text-gray-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                        {log.memory?.contact?.name ? log.memory.contact.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="truncate max-w-[150px]">
                        {log.memory?.contact?.name || log.memory?.contact?.phone || log.contactId}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-mono rounded text-[11px]">
                        {log.field}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 font-mono text-[11px] truncate max-w-[140px]">
                      {log.previousValue || 'null'}
                    </td>
                    <td className="px-5 py-3.5 text-green-700 font-medium font-mono text-[11px] truncate max-w-[180px]">
                      {log.newValue}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px]">
                        <Sparkles className="w-3 h-3" />
                        {log.source} ({log.skill || 'auto'})
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
