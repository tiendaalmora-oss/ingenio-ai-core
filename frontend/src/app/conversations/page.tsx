'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  MessageSquare, 
  Search, 
  Send, 
  User, 
  Bot, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  Phone, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import Link from 'next/link';

export default function ConversationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // 1. Fetch conversations list
  const { 
    data: convsData, 
    isLoading: isConvsLoading, 
    refetch: refetchConvs 
  } = useQuery({
    queryKey: ['conversations-list', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '50');

      const res = await api.get(`/conversations?${params.toString()}`);
      return res.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds for new live chats
  });

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (convsData?.data && convsData.data.length > 0 && !selectedConvId) {
      setSelectedConvId(convsData.data[0].id);
    }
  }, [convsData, selectedConvId]);

  // 2. Fetch selected conversation detail
  const { data: currentConv } = useQuery({
    queryKey: ['conversation-detail', selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return null;
      const res = await api.get(`/conversations/${selectedConvId}`);
      return res.data;
    },
    enabled: !!selectedConvId,
  });

  // 3. Fetch messages for selected conversation
  const { 
    data: messagesData, 
    isLoading: isMessagesLoading,
    refetch: refetchMessages 
  } = useQuery({
    queryKey: ['conversation-messages', selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return null;
      const res = await api.get(`/conversations/${selectedConvId}/messages?limit=100`);
      return res.data;
    },
    enabled: !!selectedConvId,
    refetchInterval: 3000, // Poll messages every 3s
  });

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

  // 4. Send manual human message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConvId) return;
      const res = await api.post(`/conversations/${selectedConvId}/messages`, { content });
      return res.data;
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      addToast('Mensaje enviado por WhatsApp', 'success');
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al enviar mensaje', 'error');
    },
  });

  // 5. Update conversation status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/conversations/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, vars) => {
      addToast(`Conversación marcada como ${vars.status}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedConvId] });
    },
  });

  // 6. Reset conversation history & contact memory mutation
  const resetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/conversations/${id}/history`);
      return res.data;
    },
    onSuccess: () => {
      addToast('Historial y memoria del contacto reiniciados', 'success');
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      setConfirmResetOpen(false);
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al reiniciar historial', 'error');
    },
  });

  // 7. Purge contact completely from CRM & Database (Reset Total desde Cero)
  const purgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/conversations/${id}/purge-contact`);
      return res.data;
    },
    onSuccess: () => {
      addToast('Prospecto y todo su historial eliminados por completo del CRM', 'success');
      setSelectedConvId(null);
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      setConfirmResetOpen(false);
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al eliminar contacto', 'error');
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendMutation.isPending) return;
    sendMutation.mutate(replyText.trim());
  };

  const conversations = convsData?.data || [];

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* ── LEFT: Conversations List ────────────────────────────────────────── */}
      <div className="w-80 md:w-96 border-r border-gray-200 flex flex-col bg-gray-50/50">
        {/* Header & Search */}
        <div className="p-4 border-b border-gray-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Live Chat Hub
            </h2>
            <button
              onClick={() => refetchConvs()}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              title="Refrescar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 overflow-x-auto text-[11px]">
            {[
              { label: 'Todos', value: '' },
              { label: 'Activos', value: 'ACTIVE' },
              { label: 'Handoff', value: 'HANDOFF' },
              { label: 'Resueltos', value: 'RESOLVED' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-2.5 py-1 rounded-full font-medium transition whitespace-nowrap ${
                  statusFilter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {isConvsLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200/60 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay conversaciones registradas aún.
            </div>
          ) : (
            conversations.map((c: any) => {
              const isSelected = selectedConvId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={`w-full p-3.5 text-left flex gap-3 transition hover:bg-gray-100/80 ${
                    isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {c.contactName ? c.contactName.charAt(0).toUpperCase() : 'U'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {c.contactName || c.contactPhone || 'Prospecto'}
                      </p>
                      {c.lastMessage?.timestamp && (
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {new Date(c.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 truncate mb-1">
                      {c.lastMessage?.content || 'Sin mensajes'}
                    </p>

                    <div className="flex items-center gap-1.5">
                      {c.status === 'HANDOFF' ? (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                          Handoff
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[10px] font-medium rounded">
                          Bot Activo
                        </span>
                      )}

                      {c.leadStatus && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-medium rounded">
                          {c.leadStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat Window ──────────────────────────────────────────────── */}
      {selectedConvId && currentConv ? (
        <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
          {/* Top Bar */}
          <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {currentConv.contact.name ? currentConv.contact.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-900 truncate">
                  {currentConv.contact.name || 'Prospecto'}
                </h3>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {currentConv.contact.phone || 'Sin número'}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link
                href={`/crm`}
                className="px-2.5 py-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
              >
                Ver en CRM
              </Link>

              {currentConv.status !== 'HANDOFF' ? (
                <button
                  onClick={() => statusMutation.mutate({ id: selectedConvId, status: 'HANDOFF' })}
                  className="px-2.5 py-1.5 text-xs text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg font-medium transition"
                >
                  Pausar Bot (Tomar Chat)
                </button>
              ) : (
                <button
                  onClick={() => statusMutation.mutate({ id: selectedConvId, status: 'ACTIVE' })}
                  className="px-2.5 py-1.5 text-xs text-green-800 bg-green-100 hover:bg-green-200 rounded-lg font-medium transition"
                >
                  Reactivar Bot
                </button>
              )}

              {/* Botón de Borrar Historial de Contacto para Pruebas */}
              <button
                onClick={() => setConfirmResetOpen(true)}
                className="px-2.5 py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg font-medium transition flex items-center gap-1"
                title="Borrar mensajes y memoria de este contacto para volver a probar desde cero"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Borrar Historial
              </button>
            </div>
          </div>

          {/* Messages Timeline */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isMessagesLoading ? (
              <LoadingSkeleton rows={5} />
            ) : (
              (messagesData?.data || []).map((msg: any) => {
                if (msg.type === 'TOOL_RESULT' || msg.role === 'tool') {
                  return null;
                }

                const isUser = msg.role === 'user' || (msg.direction === 'INBOUND' && msg.type === 'TEXT');
                const isHuman = msg.role === 'human';
                const isTool = msg.type === 'TOOL_CALL';

                if (isTool) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[11px] font-medium">
                        <Sparkles className="w-3.5 h-3.5" />
                        Hermes actualizó CRM / Memoria
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${isUser ? 'justify-start' : 'justify-end'}`}
                  >
                    {isUser && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[10px] shrink-0 font-bold">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className="max-w-[70%] space-y-1">
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-white border border-gray-200 text-gray-900 rounded-tl-none'
                            : isHuman
                            ? 'bg-purple-600 text-white rounded-tr-none'
                            : 'bg-blue-600 text-white rounded-tr-none'
                        }`}
                      >
                        {!isUser && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold opacity-80 mb-1">
                            {isHuman ? <UserCheck className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                            {isHuman ? 'Operador Humano' : 'Hermes AI'}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      <p
                        className={`text-[10px] text-gray-400 px-1 ${
                          isUser ? 'text-left' : 'text-right'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {!isUser && (
                      <div
                        className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-[10px] shrink-0 font-bold ${
                          isHuman ? 'bg-purple-600' : 'bg-blue-600'
                        }`}
                      >
                        {isHuman ? <UserCheck className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Box */}
          <div className="p-4 bg-white border-t border-gray-200">
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escribe una respuesta manual (se enviará por WhatsApp)..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sendMutation.isPending}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {sendMutation.isPending ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-center bg-gray-50">
          <EmptyState
            title="Selecciona una conversación"
            description="Elige un chat de la lista de la izquierda para ver el historial y responder en tiempo real."
          />
        </div>
      )}

      {/* Modal de confirmación de reset de historial y purga */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900">Opciones de Reinicio de Prueba</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Selecciona cómo deseas reiniciar este número para tus pruebas:
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => selectedConvId && purgeMutation.mutate(selectedConvId)}
                disabled={purgeMutation.isPending || resetMutation.isPending}
                className="w-full p-3 text-left rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-300 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700">🧨 Borrar TODO el Contacto (Reset Total)</span>
                  <span className="text-[10px] bg-red-200 text-red-800 font-bold px-2 py-0.5 rounded">Recomendado</span>
                </div>
                <p className="text-[11px] text-red-600/80 mt-1">
                  Elimina el número del CRM, borra estados, etiquetas, memoria y mensajes. Cuando vuelva a escribir, empezará como un cliente 100% nuevo.
                </p>
              </button>

              <button
                type="button"
                onClick={() => selectedConvId && resetMutation.mutate(selectedConvId)}
                disabled={resetMutation.isPending || purgeMutation.isPending}
                className="w-full p-3 text-left rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-100 transition"
              >
                <span className="text-xs font-bold text-gray-800">🧹 Borrar Solo Historial de Mensajes</span>
                <p className="text-[11px] text-gray-500 mt-1">
                  Limpia los mensajes del chat y la memoria pero mantiene el contacto en el CRM.
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                disabled={resetMutation.isPending || purgeMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
