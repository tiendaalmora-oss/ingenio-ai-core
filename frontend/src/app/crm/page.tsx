'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import SearchBox from '@/components/ui/SearchBox';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useToast } from '@/components/ui/ToastProvider';
import StageFilter from '@/features/crm/StageFilter';
import LeadsTable from '@/features/crm/LeadsTable';
import KanbanBoard from '@/features/crm/KanbanBoard';
import CreateLeadDialog from '@/features/crm/CreateLeadDialog';
import CrmPagination from '@/features/crm/CrmPagination';
import LeadDetailDrawer from '@/features/crm/LeadDetailDrawer';
import { LeadsResponse, KanbanStage } from '@/features/crm/types';
import {
  Users,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CheckSquare,
  LayoutGrid,
  List,
  UserPlus,
  Download,
  Flame,
  CheckCircle2
} from 'lucide-react';

const PAGE_SIZE = 100;

export default function CrmPage() {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Fetch leads with query parameters
  const { data, isLoading, isError, refetch, isFetching } = useQuery<LeadsResponse>({
    queryKey: ['crm-leads', search, selectedStage, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedStage) params.append('stage', selectedStage);
      params.append('page', currentPage.toString());
      params.append('limit', PAGE_SIZE.toString());

      const res = await api.get(`/crm/leads?${params.toString()}`);
      return res.data;
    },
    refetchOnWindowFocus: false,
  });

  // Stage change mutation
  const stageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: KanbanStage }) => {
      const res = await api.patch(`/crm/leads/${id}/stage`, { stage });
      return res.data;
    },
    onSuccess: (resData) => {
      addToast(`Estado actualizado a "${resData.kanbanStage}"`, 'success');
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      if (selectedLeadId) {
        queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', selectedLeadId] });
      }
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al actualizar estado', 'error');
    },
  });

  // Compute stage counts and flatten leads list
  const stageCounts: Record<string, number> = {};
  let allLeadsList: any[] = [];

  if (data?.kanban) {
    Object.entries(data.kanban).forEach(([stg, leads]) => {
      stageCounts[stg] = leads.length;
      allLeadsList = allLeadsList.concat(leads);
    });
  }

  // Filter if specific stage is active
  const displayedLeads = selectedStage
    ? data?.kanban?.[selectedStage] || []
    : allLeadsList;

  const totalLeads = data?.total ?? displayedLeads.length;

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStageSelect = (stg: string) => {
    setSelectedStage(stg);
    setCurrentPage(1);
  };

  // Export leads to CSV
  const handleExportCSV = () => {
    if (!allLeadsList.length) {
      addToast('No hay prospectos para exportar', 'info');
      return;
    }

    const headers = ['ID', 'Nombre', 'Telefono', 'Empresa/Colegio', 'Estado', 'Score', 'Intereses', 'Etiquetas', 'Ultimo Mensaje'];
    const rows = allLeadsList.map((l) => [
      l.id,
      `"${l.name || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.company || ''}"`,
      l.leadStatus || '',
      l.score || '',
      `"${(l.interests || []).join(', ')}"`,
      `"${(l.tags || []).join(', ')}"`,
      `"${(l.lastMessageContent || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `prospectos_crm_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Archivo CSV descargado con éxito', 'success');
  };

  return (
    <PageContainer maxWidth="max-w-[1600px]">
      {/* Header */}
      <PageHeader
        title="Gestión de CRM & Prospectos"
        description="Seguimiento visual del embudo de ventas, calificación con IA y gestión de clientes."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Nuevo Prospecto</span>
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-xs transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        }
      />

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium">Total Prospectos</span>
            <h4 className="text-lg font-bold text-gray-900">{totalLeads}</h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium">Interesados (Warm)</span>
            <h4 className="text-lg font-bold text-blue-700">{stageCounts['Interesado'] || 0}</h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium">Listos para Pagar (Hot)</span>
            <h4 className="text-lg font-bold text-amber-600">{stageCounts['Oferta'] || 0}</h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium">Ventas Cerradas (Closed)</span>
            <h4 className="text-lg font-bold text-green-600">{stageCounts['Venta'] || 0}</h4>
          </div>
        </div>
      </div>

      {/* Filter and View Mode Switcher */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="w-full md:w-80">
          <SearchBox
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por nombre, teléfono o colegio..."
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {viewMode === 'table' && (
            <StageFilter
              selectedStage={selectedStage}
              onSelectStage={handleStageSelect}
              counts={stageCounts}
            />
          )}

          {/* Switcher Table / Kanban */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'kanban'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Tablero
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Tabla
            </button>
          </div>
        </div>
      </div>

      {/* Main CRM Content */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <LoadingSkeleton rows={8} />
        </div>
      ) : isError ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <EmptyState
            title="Error al cargar prospectos"
            description="No pudimos conectar con el servidor. Intenta actualizar la página."
          />
        </div>
      ) : displayedLeads.length === 0 && search ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <EmptyState
            title="Sin resultados"
            description={`No se encontraron prospectos que coincidan con "${search}"`}
          />
        </div>
      ) : displayedLeads.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <EmptyState
            title="No hay prospectos aún"
            description="A medida que las personas te escriban a WhatsApp o agregues nuevos prospectos, aparecerán aquí clasificados automáticamente."
          />
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          kanban={data?.kanban || {}}
          onSelectLead={(id) => setSelectedLeadId(id)}
          onMoveStage={(id, stage) => stageMutation.mutate({ id, stage })}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <LeadsTable
            leads={displayedLeads}
            onSelectLead={(id) => setSelectedLeadId(id)}
            onChangeStage={(id, stage) => stageMutation.mutate({ id, stage })}
          />
        </div>
      )}

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />

      {/* Create Lead Modal */}
      <CreateLeadDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </PageContainer>
  );
}
