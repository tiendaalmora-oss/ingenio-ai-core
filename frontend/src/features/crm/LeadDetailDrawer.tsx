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
} from 'lucide-react';

interface LeadDetailDrawerProps {
  leadId: string | null;
  onClose: () => void;
}

export default function LeadDetailDrawer({ leadId, onClose }: LeadDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'conversations' | 'tasks'>('info');
  const queryClient = useQueryClient();
  const { addToast } = useToast();

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
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      onClose();
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al eliminar prospecto', 'error');
    },
  });

  if (!leadId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gray-50/50">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
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
                <X className="w-4 h-4 hidden" />
                <span className="text-xs font-bold flex items-center gap-1">
                  🗑️ Borrar Lead
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
                    {/* Score Card */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
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
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
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
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
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

                      {/* Tags */}
                      <div>
                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-2">
                          <Tag className="w-3.5 h-3.5 text-blue-600" />
                          Etiquetas / Tags
                        </span>
                        {lead.tags && lead.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {lead.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md border border-blue-200"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin etiquetas</span>
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
                          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
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
                                    className={`flex flex-col ${
                                      isOutbound ? 'items-end' : 'items-start'
                                    }`}
                                  >
                                    <div
                                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                        isOutbound
                                          ? 'bg-blue-600 text-white rounded-br-none'
                                          : 'bg-gray-100 text-gray-900 rounded-bl-none'
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 px-1">
                                      {isOutbound ? (
                                        <ArrowUpRight className="w-3 h-3 text-blue-500" />
                                      ) : (
                                        <ArrowDownLeft className="w-3 h-3 text-gray-400" />
                                      )}
                                      <span>
                                        {msg.timestamp
                                          ? new Date(msg.timestamp).toLocaleTimeString()
                                          : ''}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-gray-400 text-center py-4">
                                Sin mensajes registrados en esta sesión.
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                        <MessageSquare className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm">No hay conversaciones registradas.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Tasks */}
                {activeTab === 'tasks' && (
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                      <span>Tareas Asignadas</span>
                      <span className="text-xs text-gray-500 font-normal">
                        Total: {lead.tasks?.length || 0}
                      </span>
                    </h3>
                    <LeadTasksList tasks={lead.tasks || []} />
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
