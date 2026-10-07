'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { LeadDetail, KanbanStage } from './types';
import LeadStageBadge from './LeadStageBadge';
import LeadScoreBadge from './LeadScoreBadge';
import LeadTasksList from './LeadTasksList';
import { useToast } from '@/components/ui/ToastProvider';
import {
  X,
  Phone,
  Building,
  MessageSquare,
  CheckSquare,
  User,
  Tag,
  ThumbsUp,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  BadgeDollarSign,
  Plus,
  CheckCircle2,
  RotateCcw,
  CreditCard,
  Calendar,
  Building2,
  Trash2
} from 'lucide-react';
import Link from 'next/link';

interface LeadDetailDrawerProps {
  leadId: string | null;
  onClose: () => void;
}

export default function LeadDetailDrawer({ leadId, onClose }: LeadDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'conversations' | 'tasks'>('info');
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isManualSaleOpen, setIsManualSaleOpen] = useState(false);

  // Formulario de venta manual
  const [saleProduct, setSaleProduct] = useState('');
  const [saleAmount, setSaleAmount] = useState<number>(7250);
  const [saleCurrency, setSaleCurrency] = useState<'BS' | 'USD'>('BS');
  const [salePaymentMethod, setSalePaymentMethod] = useState('Pago Móvil BDV');
  const [saleReference, setSaleReference] = useState('');

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Consulta del detalle del lead
  const { data: lead, isLoading, isError } = useQuery<LeadDetail>({
    queryKey: ['crm-lead-detail', leadId],
    queryFn: async () => {
      if (!leadId) return null as unknown as LeadDetail;
      const res = await api.get(`/crm/leads/${leadId}`);
      return res.data;
    },
    enabled: !!leadId,
    refetchOnWindowFocus: false,
  });

  // Consulta catálogo de productos del negocio para autocompletar
  const { data: bootstrapData } = useQuery({
    queryKey: ['business-studio-bootstrap'],
    queryFn: async () => {
      const res = await api.get('/business-studio/bootstrap');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const availableProducts = (bootstrapData?.knowledgeBundle?.productos || []) as Array<{ nombre: string; precio?: string }>;

  // ── Mutaciones ─────────────────────────────────────────────────────────────

  const stageMutation = useMutation({
    mutationFn: async (newStage: KanbanStage) => {
      const res = await api.patch(`/crm/leads/${leadId}/stage`, { stage: newStage });
      return res.data;
    },
    onSuccess: (data) => {
      addToast(`Estado actualizado a "${data.kanbanStage}"`, 'success');
      queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      addToast(err?.response?.data?.message || 'Error al cambiar stage', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/crm/leads/${leadId}`);
      return res.data;
    },
    onSuccess: () => {
      addToast('Prospecto y todo su historial eliminados del CRM', 'success');
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      onClose();
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al eliminar prospecto', 'error');
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      const res = await api.post(`/crm/leads/${leadId}/tags`, { tag });
      return res.data;
    },
    onSuccess: () => {
      addToast('Etiqueta agregada', 'success');
      setNewTagInput('');
      setIsAddingTag(false);
      queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al agregar etiqueta', 'error');
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      const res = await api.delete(`/crm/leads/${leadId}/tags/${encodeURIComponent(tag)}`);
      return res.data;
    },
    onSuccess: () => {
      addToast('Etiqueta eliminada', 'success');
      queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al eliminar etiqueta', 'error');
    },
  });

  const registerSaleMutation = useMutation({
    mutationFn: async (saleData: {
      productName: string;
      amount: number;
      currency: 'BS' | 'USD';
      paymentMethod: string;
      reference?: string;
    }) => {
      const res = await api.post(`/crm/leads/${leadId}/sale`, saleData);
      return res.data;
    },
    onSuccess: () => {
      addToast('¡Venta registrada exitosamente!', 'success');
      setIsManualSaleOpen(false);
      setSaleReference('');
      queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al registrar venta', 'error');
    },
  });

  const cancelSaleMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/crm/leads/${leadId}/cancel-sale`);
      return res.data;
    },
    onSuccess: () => {
      addToast('Venta anulada. Lead retornado a etapa Interesado.', 'success');
      queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al anular venta', 'error');
    },
  });

  if (!leadId) return null;

  const isSold = lead?.leadStatus === 'CLOSED' || (lead?.tags || []).includes('PAGO_CONFIRMADO');

  // Intentar encontrar el comprobante detectado en las conversaciones
  const detectedReceiptMsg = lead?.conversations
    ?.flatMap((c) => c.messages || [])
    ?.find((m) => m.content?.includes('Comprobante de Pago Detectado'))?.content;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gray-50/50">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                  {lead?.name?.charAt(0) || 'L'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {lead?.name || (isLoading ? 'Cargando lead...' : 'Detalle del Lead')}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    {lead?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {lead.phone}
                      </span>
                    )}
                    {lead?.company && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        {lead.company}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm('¿Eliminar por completo este prospecto y todo su historial de mensajes/memoria?')) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                title="Eliminar prospecto y resetear toda su data"
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
              >
                <span className="text-xs font-bold flex items-center gap-1">
                  <Trash2 className="w-4 h-4" />
                  Borrar Lead
                </span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 px-6 gap-6 bg-white flex-shrink-0">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'info'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <User className="w-4 h-4" />
              Información & Memoria
            </button>
            <button
              onClick={() => setActiveTab('conversations')}
              className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'conversations'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Conversaciones ({lead?.conversations?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'tasks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Tareas ({lead?.tasks?.length || 0})
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-28 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-44 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ) : isError || !lead ? (
              <div className="text-center py-12 text-red-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Error al cargar la información del lead.</p>
              </div>
            ) : (
              <>
                {/* Tab: Info & Memory */}
                {activeTab === 'info' && (
                  <div className="space-y-6">

                    {/* ── TARJETA DE CONTROL COMERCIAL / VENTAS ──────────────── */}
                    <div className="rounded-xl border shadow-xs overflow-hidden transition bg-white">
                      {isSold ? (
                        <div className="p-4 bg-emerald-50/80 border-b border-emerald-200">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                <BadgeDollarSign className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-black text-emerald-900">
                                    ¡Venta Concretada y Confirmada!
                                  </h4>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 uppercase">
                                    Pagado
                                  </span>
                                </div>
                                <p className="text-xs text-emerald-700 mt-0.5">
                                  Producto:{' '}
                                  <strong>{lead.interests?.[0] || 'Producto del Catálogo'}</strong>
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    '¿Estás seguro de anular esta venta? El contacto volverá al estado "Interesado" (Warm), se eliminarán las etiquetas de pago y se descontará del Tablero de Ventas del Día.'
                                  )
                                ) {
                                  cancelSaleMutation.mutate();
                                }
                              }}
                              disabled={cancelSaleMutation.isPending}
                              className="px-2.5 py-1.5 bg-white hover:bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
                              title="Anular venta si el bot o cliente se equivocó"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Anular Venta / Corregir
                            </button>
                          </div>

                          {detectedReceiptMsg && (
                            <div className="mt-3 p-2.5 bg-white/80 rounded-lg border border-emerald-200 text-[11px] text-emerald-950 font-mono">
                              {detectedReceiptMsg}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 flex items-center justify-between bg-blue-50/50 border-b border-blue-100">
                          <div>
                            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <BadgeDollarSign className="w-4 h-4 text-blue-600" />
                              Control Comercial de Venta
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              ¿El cliente pagó por transferencia externa o en persona? Registra la venta aquí.
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setIsManualSaleOpen(!isManualSaleOpen);
                              if (!saleProduct) {
                                setSaleProduct(lead.interests?.[0] || availableProducts[0]?.nombre || 'Kit Digital');
                              }
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {isManualSaleOpen ? 'Cerrar Formulario' : 'Registrar Venta Manual'}
                          </button>
                        </div>
                      )}

                      {/* Formulario desplegable para registrar venta manual */}
                      {!isSold && isManualSaleOpen && (
                        <div className="p-4 bg-gray-50 space-y-3 border-t border-gray-100 text-xs">
                          <p className="font-bold text-gray-800">Datos de la Venta a Registrar:</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] text-gray-500 font-semibold block mb-1">
                                Producto Adquirido:
                              </label>
                              <input
                                list="available-products-list"
                                type="text"
                                value={saleProduct}
                                onChange={(e) => setSaleProduct(e.target.value)}
                                placeholder="Ej: Kit de Química..."
                                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
                              />
                              <datalist id="available-products-list">
                                {availableProducts.map((p, idx) => (
                                  <option key={idx} value={p.nombre} />
                                ))}
                              </datalist>
                            </div>

                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-[11px] text-gray-500 font-semibold block mb-1">
                                  Monto:
                                </label>
                                <input
                                  type="number"
                                  value={saleAmount}
                                  onChange={(e) => setSaleAmount(parseFloat(e.target.value) || 0)}
                                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
                                />
                              </div>
                              <div className="w-24">
                                <label className="text-[11px] text-gray-500 font-semibold block mb-1">
                                  Moneda:
                                </label>
                                <select
                                  value={saleCurrency}
                                  onChange={(e) => setSaleCurrency(e.target.value as 'BS' | 'USD')}
                                  className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-800"
                                >
                                  <option value="BS">Bs</option>
                                  <option value="USD">USD</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] text-gray-500 font-semibold block mb-1">
                                Banco o Pasarela de Pago:
                              </label>
                              <select
                                value={salePaymentMethod}
                                onChange={(e) => setSalePaymentMethod(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
                              >
                                <option value="Pago Móvil BDV">Pago Móvil BDV</option>
                                <option value="Banco Mercantil">Banco Mercantil</option>
                                <option value="Banesco">Banesco</option>
                                <option value="Binance Pay (USDT)">Binance Pay (USDT)</option>
                                <option value="Zelle">Zelle</option>
                                <option value="Efectivo / Otro">Efectivo / Otro</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] text-gray-500 font-semibold block mb-1">
                                N° de Referencia (opcional):
                              </label>
                              <input
                                type="text"
                                value={saleReference}
                                onChange={(e) => setSaleReference(e.target.value)}
                                placeholder="Ej: 007563425966"
                                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={() => setIsManualSaleOpen(false)}
                              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-medium"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => {
                                if (!saleProduct) {
                                  alert('Por favor especifica el producto adquirido.');
                                  return;
                                }
                                registerSaleMutation.mutate({
                                  productName: saleProduct,
                                  amount: saleAmount,
                                  currency: saleCurrency,
                                  paymentMethod: salePaymentMethod,
                                  reference: saleReference || undefined,
                                });
                              }}
                              disabled={registerSaleMutation.isPending}
                              className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Confirmar Venta y Pasar a Pagado
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Score Card */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          AI Lead Score
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
                          Calculado automáticamente según interés y nivel de interacción.
                        </p>
                      </div>
                      <LeadScoreBadge score={lead.score || 0} />
                    </div>

                    {/* Contact Details */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
                        Datos del Contacto
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-xs text-gray-500 block">Nombre Completo</span>
                          <span className="font-medium text-gray-800">{lead.name || '—'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Teléfono / WhatsApp</span>
                          <span className="font-medium text-gray-800">{lead.phone || '—'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Empresa</span>
                          <span className="font-medium text-gray-800">{lead.company || '—'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Última Interacción</span>
                          <span className="font-medium text-gray-800">
                            {lead.lastInteraction
                              ? new Date(lead.lastInteraction).toLocaleString()
                              : 'Sin interacciones'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Business Memory (Interests, Objections, Tags) */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
                        Memoria de Negocio (KOS)
                      </h3>

                      {/* Intereses */}
                      <div>
                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-2">
                          <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                          Intereses Detectados
                        </span>
                        {lead.interests && lead.interests.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {lead.interests.map((interest, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200"
                              >
                                {interest}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Ninguno detectado aún</span>
                        )}
                      </div>

                      {/* Objeciones */}
                      <div>
                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Objeciones Registradas
                        </span>
                        {lead.objections && lead.objections.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {lead.objections.map((obj, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-md border border-amber-200"
                              >
                                {obj}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin objeciones registradas</span>
                        )}
                      </div>

                      {/* ── GESTOR INTERACTIVO DE ETIQUETAS (TAGS) ──────────────── */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-blue-600" />
                            Etiquetas Comerciales
                          </span>
                          {!isAddingTag && (
                            <button
                              onClick={() => setIsAddingTag(true)}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                            >
                              <Plus className="w-3 h-3" />
                              Añadir etiqueta
                            </button>
                          )}
                        </div>

                        {/* Input para agregar etiqueta */}
                        {isAddingTag && (
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <input
                              type="text"
                              value={newTagInput}
                              onChange={(e) => setNewTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newTagInput.trim()) {
                                  addTagMutation.mutate(newTagInput.trim());
                                }
                              }}
                              placeholder="Ej: PAGO_CONFIRMADO, PROD_QUIMICA..."
                              className="flex-1 bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                if (newTagInput.trim()) {
                                  addTagMutation.mutate(newTagInput.trim());
                                }
                              }}
                              disabled={addTagMutation.isPending || !newTagInput.trim()}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => {
                                setIsAddingTag(false);
                                setNewTagInput('');
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {lead.tags && lead.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {lead.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                                  tag === 'PAGO_CONFIRMADO' || tag === 'COMPROBANTE_RECIBIDO'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                                    : tag.startsWith('PROD_') || tag.startsWith('INTERESADO_')
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                #{tag}
                                <button
                                  onClick={() => {
                                    if (confirm(`¿Eliminar la etiqueta #${tag} de este contacto?`)) {
                                      removeTagMutation.mutate(tag);
                                    }
                                  }}
                                  disabled={removeTagMutation.isPending}
                                  title="Eliminar etiqueta"
                                  className="text-gray-400 hover:text-red-600 rounded-full p-0.5 hover:bg-white/60 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin etiquetas asignadas</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Conversations & Chat history */}
                {activeTab === 'conversations' && (
                  <div className="space-y-6">
                    {lead.conversations && lead.conversations.length > 0 ? (
                      lead.conversations.map((conv) => (
                        <div
                          key={conv.id}
                          className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden"
                        >
                          <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-800">
                                Conversación #{conv.id.slice(-6)}
                              </span>
                              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                {conv.status}
                              </span>
                            </div>
                            {conv.activeFunnel && (
                              <span className="text-xs text-purple-600 font-medium">
                                Funnel: {conv.activeFunnel.funnelId} (Paso: {conv.activeFunnel.step})
                              </span>
                            )}
                          </div>

                          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                            {conv.messages && conv.messages.length > 0 ? (
                              conv.messages.map((msg) => {
                                const isOutbound = msg.direction === 'OUTBOUND';
                                return (
                                  <div
                                    key={msg.id}
                                    className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                                  >
                                    <div
                                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs ${
                                        isOutbound
                                          ? 'bg-blue-600 text-white rounded-br-xs'
                                          : 'bg-gray-100 text-gray-900 rounded-bl-xs'
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                                      {new Date(msg.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-center text-xs text-gray-400 py-4">
                                No hay mensajes registrados en esta conversación.
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-xs text-gray-400 py-8">
                        No hay conversaciones activas con este contacto.
                      </p>
                    )}
                  </div>
                )}

                {/* Tab: Tasks */}
                {activeTab === 'tasks' && (
                  <div className="space-y-4">
                    <LeadTasksList contactId={lead.id} tasks={lead.tasks || []} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
