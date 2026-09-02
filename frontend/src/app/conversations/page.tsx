'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
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
  ArrowLeft,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import QuickRepliesBar from '@/features/conversations/QuickRepliesBar';

function ConversationsView() {
  const searchParams = useSearchParams();
  const urlConvId = searchParams ? searchParams.get('id') : null;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(urlConvId || null);
  const [replyText, setReplyText] = useState('');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [showCrmDrawer, setShowCrmDrawer] = useState(false);

  // Sync selected conversation when URL param 'id' changes or custom event fires
  useEffect(() => {
    if (urlConvId) {
      setSelectedConvId(urlConvId);
    }
  }, [urlConvId]);

  useEffect(() => {
    const handleOpen = (e: any) => {
      if (e?.detail?.conversationId) {
        setSelectedConvId(e.detail.conversationId);
      }
    };
    window.addEventListener('crm_open_conversation', handleOpen);
    return () => window.removeEventListener('crm_open_conversation', handleOpen);
  }, []);

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
    refetchInterval: 4000, // Poll every 4 seconds for new live chats
  });

  // Auto-select first conversation on desktop only if no conversation is selected from URL
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      if (convsData?.data && convsData.data.length > 0 && !selectedConvId && !urlConvId) {
        setSelectedConvId(convsData.data[0].id);
      }
    }
  }, [convsData, selectedConvId, urlConvId]);

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

  // When the operator enters/views a conversation, auto-dismiss any alert for that conversation/contact
  useEffect(() => {
    if (selectedConvId && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('crm_dismissed_alerts');
        const dismissed: string[] = stored ? JSON.parse(stored) : [];
        const toAdd = [`handoff-${selectedConvId}`];
        if (currentConv?.contact?.id) {
          toAdd.push(`pay-${currentConv.contact.id}`, `hot-${currentConv.contact.id}`);
        }
        const updated = Array.from(new Set([...dismissed, ...toAdd]));
        if (updated.length !== dismissed.length) {
          localStorage.setItem('crm_dismissed_alerts', JSON.stringify(updated));
          window.dispatchEvent(new Event('crm_alerts_updated'));
        }
      } catch {}
    }
  }, [selectedConvId, currentConv]);

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
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* ── LEFT: Conversations List (1 por contacto único) ─────────────────── */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col bg-gray-50/50 ${
          selectedConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header & Search */}
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-white space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Live Chat Hub
            </h2>
            <button
              onClick={() => refetchConvs()}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              title="Refrescar bandeja"
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
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 overflow-x-auto text-[11px] pb-0.5 no-scrollbar">
            {[
              { label: 'Todos', value: '' },
              { label: '🤖 Bot Activo', value: 'ACTIVE' },
              { label: '👤 En Asesor', value: 'HANDOFF' },
              { label: '🛑 No Interesado', value: 'LOST' },
              { label: '✅ Resueltos', value: 'RESOLVED' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-2.5 py-1 rounded-full font-medium transition whitespace-nowrap ${
                  statusFilter === f.value
                    ? 'bg-blue-600 text-white shadow-xs'
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
              No hay conversaciones en este filtro.
            </div>
          ) : (
            conversations.map((c: any) => {
              const isSelected = selectedConvId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={`w-full p-3 sm:p-3.5 text-left flex gap-3 transition hover:bg-gray-100/80 ${
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

                    <p className="text-xs text-gray-500 truncate mb-1.5">
                      {c.lastMessage?.content || 'Sin mensajes'}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {c.status === 'HANDOFF' ? (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                          👤 Asesor
                        </span>
                      ) : c.status === 'LOST' ? (
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded">
                          🛑 No Interesado
                        </span>
                      ) : c.status === 'RESOLVED' ? (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-medium rounded">
                          ✅ Resuelto
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-medium rounded">
                          🤖 Bot Activo
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

      {/* ── RIGHT: Chat Window & Ficha CRM ──────────────────────────────────── */}
      {selectedConvId && currentConv ? (
        <div className="flex-1 flex bg-slate-50 min-w-0 w-full overflow-hidden">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full border-r border-gray-200">
            {/* Top Bar */}
            <div className="h-16 px-3 sm:px-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0 gap-2 flex-wrap">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Back button on mobile */}
                <button
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 shrink-0"
                  aria-label="Volver a la lista"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {currentConv.contact.name ? currentConv.contact.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                    {currentConv.contact.name || 'Prospecto'}
                  </h3>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span className="truncate">{currentConv.contact.phone || 'Sin número'}</span>
                  </p>
                </div>
              </div>

              {/* Quick Actions Header */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Status Toggle Buttons */}
                {currentConv.status === 'HANDOFF' || currentConv.status === 'PAUSED' || currentConv.status === 'LOST' ? (
                  <button
                    onClick={() => statusMutation.mutate({ id: selectedConvId, status: 'ACTIVE' })}
                    className="px-2.5 py-1.5 text-xs text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg font-bold transition flex items-center gap-1"
                    title="Reactivar bot para este contacto"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    Reanudar Bot
                  </button>
                ) : (
                  <button
                    onClick={() => statusMutation.mutate({ id: selectedConvId, status: 'HANDOFF' })}
                    className="px-2.5 py-1.5 text-xs text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg font-bold transition flex items-center gap-1"
                    title="Pausar bot y tomar control como operador humano"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Pausar Bot
                  </button>
                )}

                {/* Mark as Resolved */}
                {currentConv.status !== 'RESOLVED' && (
                  <button
                    onClick={() => statusMutation.mutate({ id: selectedConvId, status: 'RESOLVED' })}
                    className="hidden sm:inline-flex px-2 py-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                    title="Marcar como resuelto"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Toggle CRM Drawer */}
                <button
                  onClick={() => setShowCrmDrawer(!showCrmDrawer)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition flex items-center gap-1 ${
                    showCrmDrawer ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Ver ficha CRM del prospecto"
                >
                  <User className="w-3.5 h-3.5" />
                  Ficha CRM
                </button>

                {/* Reset History for Testing */}
                <button
                  onClick={() => setConfirmResetOpen(true)}
                  className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition"
                  title="Borrar historial para pruebas"
                >
                  <Trash2 className="w-4 h-4" />
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

          {/* Quick Replies Bar */}
          <QuickRepliesBar
            tenantId={currentConv?.contact?.tenantId}
            onSelectReply={(text) => {
              setReplyText(text);
            }}
          />

          {/* Reply Box */}
          <div className="p-3 bg-white border-t border-gray-200">
            <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  rows={replyText.includes('\n') ? 3 : 1}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Escribe una respuesta manual o pulsa una Respuesta Rápida (Enter para enviar, Shift+Enter nueva línea)..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!replyText.trim() || sendMutation.isPending}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition disabled:opacity-50 shrink-0 h-[38px]"
              >
                <Send className="w-3.5 h-3.5" />
                {sendMutation.isPending ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Ficha CRM Drawer Panel ────────────────────────────────────────── */}
        {showCrmDrawer && (
          <div className="w-80 lg:w-96 border-l border-gray-200 bg-white flex flex-col h-full shadow-lg z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Ficha del Contacto (CRM)
              </h4>
              <button
                onClick={() => setShowCrmDrawer(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              {/* Contact Main Info */}
              <div className="flex items-center gap-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  {currentConv.contact.name ? currentConv.contact.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {currentConv.contact.name || 'Sin nombre asignado'}
                  </p>
                  <p className="text-gray-500 text-[11px] truncate flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {currentConv.contact.phone || 'Sin número'}
                  </p>
                </div>
              </div>

              {/* Lead Stage & Status */}
              <div className="space-y-2">
                <span className="block font-bold text-gray-700 text-[11px] uppercase tracking-wider">
                  Estado de Venta / Lead
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                    currentConv.contact.leadStatus === 'HOT' ? 'bg-red-100 text-red-700 border border-red-200' :
                    currentConv.contact.leadStatus === 'WARM' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    currentConv.contact.leadStatus === 'CLOSED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {currentConv.contact.leadStatus || 'COLD (Nuevo)'}
                  </span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-medium">
                    {currentConv.messageCount || 0} mensajes
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <span className="block font-bold text-gray-700 text-[11px] uppercase tracking-wider">
                  Etiquetas Detectadas (Tags)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(currentConv.contact.tags && currentConv.contact.tags.length > 0) ? (
                    currentConv.contact.tags.map((tag: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-medium"
                      >
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic text-[11px]">Sin etiquetas registradas</span>
                  )}
                </div>
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <span className="block font-bold text-gray-700 text-[11px] uppercase tracking-wider">
                  Intereses / Kits Consultados
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(currentConv.contact.interests && currentConv.contact.interests.length > 0) ? (
                    currentConv.contact.interests.map((int: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-medium"
                      >
                        📦 {int}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic text-[11px]">Sin intereses registrados</span>
                  )}
                </div>
              </div>

              {/* Objections */}
              <div className="space-y-2">
                <span className="block font-bold text-gray-700 text-[11px] uppercase tracking-wider">
                  Objeciones o Dudas
                </span>
                {(currentConv.contact.objections && currentConv.contact.objections.length > 0) ? (
                  <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                    {currentConv.contact.objections.map((obj: string, i: number) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-400 italic text-[11px]">Ninguna objeción registrada</span>
                )}
              </div>

              {/* Full CRM Link Button */}
              <div className="pt-3 border-t border-gray-100">
                <Link
                  href={`/crm`}
                  className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition"
                >
                  Abrir Módulo CRM Completo
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
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

export default function ConversationsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ConversationsView />
    </Suspense>
  );
}
