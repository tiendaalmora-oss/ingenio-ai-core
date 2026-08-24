'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useToast } from '@/components/ui/ToastProvider';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { 
  Building2, 
  MessageSquare, 
  Cpu, 
  Trash2, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  RefreshCw,
  Save,
  Radio
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'channels' | 'ai' | 'danger'>('general');
  const [tenantName, setTenantName] = useState('');
  const [wahaSession, setWahaSession] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data;
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data?.tenant) {
      setTenantName(data.tenant.name || '');
      setWahaSession(data.tenant.wahaSession || '');
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { name?: string; wahaSession?: string }) => {
      const res = await api.patch('/settings/tenant', payload);
      return res.data;
    },
    onSuccess: () => {
      addToast('Configuración guardada correctamente', 'success');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['bootstrap'] });
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al guardar la configuración', 'error');
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/settings/clean-slate');
      return res.data;
    },
    onSuccess: () => {
      addToast('¡CRM reiniciado a estado cero con éxito!', 'success');
      queryClient.invalidateQueries();
      setIsResetDialogOpen(false);
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al reiniciar el CRM', 'error');
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copiado al portapapeles`, 'info');
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ name: tenantName, wahaSession: wahaSession });
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="max-w-5xl">
        <LoadingSkeleton rows={8} />
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer maxWidth="max-w-5xl">
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl border border-red-200">
          Error al cargar la configuración del sistema.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="max-w-5xl">
      <PageHeader
        title="Configuración del Sistema"
        description="Administra los parámetros de tu empresa, canales de venta por mensajería y el motor de IA."
        actions={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recargar
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          General & Negocio
        </button>

        <button
          onClick={() => setActiveTab('channels')}
          className={`flex items-center gap-2 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === 'channels'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Canales (WhatsApp & Meta)
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === 'ai'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Motor de IA (Hermes)
        </button>

        <button
          onClick={() => setActiveTab('danger')}
          className={`flex items-center gap-2 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === 'danger'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          Zona de Reinicio
        </button>
      </div>

      {/* Tab 1: General */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h3 className="text-base font-semibold text-gray-900 border-b pb-3">Información del Negocio</h3>
          <form onSubmit={handleSaveGeneral} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Nombre de la Empresa / Producto
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Ej. Mi Tienda Online"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                ID de Tenant (Multi-Tenant)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={data.tenant.id || ''}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(data.tenant.id, 'Tenant ID')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center gap-1 text-xs font-medium"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Channels */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          {/* WhatsApp Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-bold">
                  WA
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">WhatsApp Gateway (WAHA)</h3>
                  <p className="text-xs text-gray-500">Conexión de mensajería para WhatsApp Web y Business.</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Conectado
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">WAHA API URL</label>
                <input
                  type="text"
                  readOnly
                  value={data.waha.apiUrl}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sesión Activa (WAHA Session)</label>
                <input
                  type="text"
                  value={wahaSession}
                  onChange={(e) => setWahaSession(e.target.value)}
                  placeholder="ferreos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => updateMutation.mutate({ wahaSession })}
                disabled={updateMutation.isPending}
                className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-xs font-medium transition"
              >
                Actualizar Sesión de WhatsApp
              </button>
            </div>
          </div>

          {/* Meta (Instagram & Facebook) Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">
                  Meta
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Meta Cloud API (Instagram Direct & Facebook)</h3>
                  <p className="text-xs text-gray-500">Recepción y respuesta omnicanal para redes sociales.</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                <Radio className="w-3.5 h-3.5" />
                Listo para vincular
              </span>
            </div>

            <div className="space-y-3 max-w-3xl">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  URL del Webhook (Para configurar en Meta Developers)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/webhooks/meta`}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${window.location.origin}/webhooks/meta`, 'Webhook URL')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center gap-1 text-xs font-medium"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Token de Verificación (*Verify Token*)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value="ingenio_meta_secret"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard('ingenio_meta_secret', 'Verify Token')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center gap-1 text-xs font-medium"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AI Engine */}
      {activeTab === 'ai' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h3 className="text-base font-semibold text-gray-900 border-b pb-3">Motor de Inferencia LLM (Hermes)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor de IA</label>
              <input
                type="text"
                readOnly
                value={data.ai.provider.toUpperCase()}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Modelo Seleccionado</label>
              <input
                type="text"
                readOnly
                value={data.ai.model}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Base URL Endpoint</label>
              <input
                type="text"
                readOnly
                value={data.ai.baseUrl}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1 max-w-3xl">
            <p className="font-semibold">💡 Orquestación Inteligente Activa:</p>
            <p>
              Hermes utiliza <strong>Function Calling</strong> para actualizar el CRM automáticamente, detectar objeciones, agendar demos y activar derivaciones a humanos en tiempo real.
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Danger Zone */}
      {activeTab === 'danger' && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 space-y-4">
          <h3 className="text-base font-semibold text-red-700 border-b border-red-100 pb-3 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            Zona de Peligro: Reinicio a Estado Cero (Clean Slate)
          </h3>
          <p className="text-sm text-gray-600 max-w-2xl">
            Esta acción eliminará <strong>todos los leads, conversaciones, mensajes, tareas y memorias registradas</strong>, y restablecerá la base de conocimiento para comenzar desde cero con tu producto.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsResetDialogOpen(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition shadow-sm"
            >
              Reiniciar Todo a Estado Cero
            </button>
          </div>
        </div>
      )}

      {/* Confirm Clean Slate Dialog */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        title="¿Reiniciar el CRM a estado cero?"
        message="Esta acción no se puede deshacer. Se eliminarán todas las conversaciones y contactos registrados para dejar el panel 100% limpio."
        confirmText="Sí, vaciar y reiniciar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={resetMutation.isPending}
        onConfirm={() => resetMutation.mutate()}
        onClose={() => setIsResetDialogOpen(false)}
      />
    </PageContainer>
  );
}
