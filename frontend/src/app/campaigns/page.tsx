'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import {
  Megaphone,
  Users,
  Send,
  Pause,
  Play,
  XCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Tag,
  ShoppingBag,
  ShieldCheck,
  MessageSquare,
  Mail,
  Smartphone,
  Eye,
  RefreshCw,
  Sliders,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

interface CampaignSummary {
  id: string;
  name: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'BOTH';
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  dripIntervalSeconds: number;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: string;
  progressPercentage: number;
}

interface FilterOptions {
  products: string[];
  tags: string[];
}

interface AudienceEstimate {
  totalCount: number;
  sampleContacts: Array<{
    id: string;
    name: string;
    phone: string;
    leadStatus: string;
    interests: string[];
    tags: string[];
  }>;
}

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'create' | 'monitor'>('create');

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL' | 'BOTH'>('WHATSAPP');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('ALL');
  const [productFilter, setProductFilter] = useState<string>('ALL');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [messageTemplate, setMessageTemplate] = useState(
    '¡Hola {{nombre}}! 👋 Te escribimos con una sorpresa especial: por haber adquirido {{producto}}, te dejamos este regalo complementario exclusivo para ti.'
  );
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'DOCUMENT'>('IMAGE');
  const [mediaFilename, setMediaFilename] = useState('');
  const [subject, setSubject] = useState('');
  const [dripIntervalSeconds, setDripIntervalSeconds] = useState(30);

  // Consulta de opciones de filtrado
  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ['campaign-filter-options'],
    queryFn: async () => {
      const res = await api.get('/campaigns/filters');
      return res.data;
    },
  });

  // Estimador de audiencia en tiempo real
  const { data: audienceEstimate, isFetching: isEstimating } = useQuery<AudienceEstimate>({
    queryKey: ['campaign-audience-estimate', leadStatusFilter, productFilter, selectedTags, channel],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (leadStatusFilter && leadStatusFilter !== 'ALL') params.append('leadStatus', leadStatusFilter);
      if (productFilter && productFilter !== 'ALL') params.append('product', productFilter);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));
      params.append('channel', channel);

      const res = await api.get(`/campaigns/estimate?${params.toString()}`);
      return res.data;
    },
  });

  // Listado de campañas activas e históricas
  const { data: campaigns = [], isLoading: isLoadingCampaigns, refetch: refetchCampaigns } = useQuery<CampaignSummary[]>({
    queryKey: ['campaigns-list'],
    queryFn: async () => {
      const res = await api.get('/campaigns');
      return res.data;
    },
    // Auto-refrescar cada 5s si hay campañas corriendo
    refetchInterval: (query) => {
      const hasRunning = (query.state.data as CampaignSummary[])?.some((c) => c.status === 'RUNNING');
      return hasRunning ? 5000 : false;
    },
  });

  // Mutación para Crear Campaña
  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: campaignName.trim(),
        channel,
        targetFilters: {
          leadStatus: leadStatusFilter !== 'ALL' ? leadStatusFilter : undefined,
          product: productFilter !== 'ALL' ? productFilter : undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        },
        messageTemplate,
        mediaUrl: mediaUrl.trim() || undefined,
        mediaType: mediaUrl.trim() ? mediaType : undefined,
        mediaFilename: mediaFilename.trim() || undefined,
        subject: subject.trim() || undefined,
        dripIntervalSeconds,
        autoStart: true,
      };

      const res = await api.post('/campaigns', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-list'] });
      setActiveTab('monitor');
      setCampaignName('');
      alert('¡Campaña iniciada con éxito! El motor de goteo seguro comenzó los envíos.');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Error al iniciar la campaña');
    },
  });

  // Mutaciones de control de campaña (Pausar, Reanudar, Cancelar)
  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/campaigns/${id}/pause`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns-list'] }),
  });

  const resumeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/campaigns/${id}/resume`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns-list'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      if (confirm('¿Estás seguro de cancelar esta campaña? Los envíos pendientes se detendrán.')) {
        await api.post(`/campaigns/${id}/cancel`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns-list'] }),
  });

  // Insertar variable en el cursor del mensaje
  const insertVariable = (varText: string) => {
    setMessageTemplate((prev) => `${prev} ${varText}`);
  };

  const totalEstimate = audienceEstimate?.totalCount || 0;
  const estimatedMinutes = Math.ceil((totalEstimate * dripIntervalSeconds) / 60);

  return (
    <PageContainer>
      <PageHeader
        title="Campañas & Difusión Inteligente"
        description="Envía promociones, regalos y novedades segmentadas por WhatsApp con motor de goteo antiban y correo electrónico."
      />

      {/* Selector de Pestañas */}
      <div className="flex items-center gap-3 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('create')}
          className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'create'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Nueva Campaña
        </button>
        <button
          onClick={() => setActiveTab('monitor')}
          className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'monitor'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Monitor de Campañas ({campaigns.length})
        </button>
      </div>

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── COLUMNA IZQUIERDA: FORMULARIO WIZARD (7 Cols) ────────────────── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Paso 1: Identificación y Canal */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-gray-900">Datos Principales y Canal</h3>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Nombre de la Campaña:
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ej: Regalo Alumnos Biología, Preventa Robótica..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-gray-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Canal de Difusión:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setChannel('WHATSAPP')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      channel === 'WHATSAPP'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('EMAIL')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      channel === 'EMAIL'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('BOTH')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      channel === 'BOTH'
                        ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Ambos
                  </button>
                </div>
              </div>
            </div>

            {/* Paso 2: Segmentación y Filtros */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-gray-900">Segmentar Audiencia</h3>
                </div>

                {/* Badge en vivo con cantidad de clientes */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-xs font-bold animate-pulse">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {isEstimating ? 'Calculando...' : `${totalEstimate} contactos encontrados`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Filtro por Estado de Compra */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Estado del Cliente:
                  </label>
                  <select
                    value={leadStatusFilter}
                    onChange={(e) => setLeadStatusFilter(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50/50"
                  >
                    <option value="ALL">Todos los Contactos</option>
                    <option value="CLOSED">Solo Compradores (Pagados)</option>
                    <option value="WARM">Solo Interesados (Sin Comprar)</option>
                    <option value="HOT">Prospectos Calientes (Hot)</option>
                    <option value="COLD">Prospectos Nuevos / Fríos</option>
                  </select>
                </div>

                {/* Filtro por Producto Adquirido */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Producto Adquirido / Interés:
                  </label>
                  <select
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50/50"
                  >
                    <option value="ALL">Cualquier Producto</option>
                    {filterOptions?.products.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selector de Etiquetas */}
              {filterOptions?.tags && filterOptions.tags.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                    Filtrar por Etiquetas Específicas:
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-gray-50 border border-gray-200 rounded-lg">
                    {filterOptions.tags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTags(selectedTags.filter((t) => t !== tag));
                            } else {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition ${
                            isSelected
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Paso 3: Redactar Mensaje & Adjunto */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-bold text-gray-900">Mensaje & Multimedia</h3>
              </div>

              {channel !== 'WHATSAPP' && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Asunto del Correo Electrónico:
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ej: Tenemos un obsequio especial para ti..."
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-gray-50/50"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-600">
                    Contenido del Mensaje:
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">Insertar variables:</span>
                    <button
                      type="button"
                      onClick={() => insertVariable('{{nombre}}')}
                      className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold transition"
                    >
                      + {'{{nombre}}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariable('{{producto}}')}
                      className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold transition"
                    >
                      + {'{{producto}}'}
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              {/* Adjuntos (Imágenes o Documentos) */}
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                    Adjunto Multimedia (Opcional):
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={mediaType === 'IMAGE'}
                        onChange={() => setMediaType('IMAGE')}
                      />
                      <span>Imagen</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={mediaType === 'DOCUMENT'}
                        onChange={() => setMediaType('DOCUMENT')}
                      />
                      <span>PDF / Documento</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="URL del archivo (ej: https://.../regalo.pdf)"
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50/50"
                  />
                  <input
                    type="text"
                    value={mediaFilename}
                    onChange={(e) => setMediaFilename(e.target.value)}
                    placeholder="Nombre del archivo (ej: Guia_Biologia.pdf)"
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Paso 4: Seguridad y Goteo Antiban */}
            <div className="bg-emerald-50/60 p-5 rounded-xl border border-emerald-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Motor de Goteo Progresivo (Antiban Seguro)
                </h4>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                  1 mensaje cada {dripIntervalSeconds}s
                </span>
              </div>

              <p className="text-xs text-emerald-800">
                Para evitar bloqueos de WhatsApp, cada mensaje se enviará progresivamente con un
                intervalo aleatorio (±4s) y simulación de escritura (&quot;Escribiendo...&quot;) en el chat.
              </p>

              <div className="flex items-center gap-4 pt-1">
                <input
                  type="range"
                  min={15}
                  max={90}
                  step={5}
                  value={dripIntervalSeconds}
                  onChange={(e) => setDripIntervalSeconds(Number(e.target.value))}
                  className="flex-1 accent-emerald-600 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-emerald-950 min-w-[70px]">
                  {dripIntervalSeconds} seg
                </span>
              </div>

              <div className="text-[11px] text-emerald-700 flex items-center justify-between pt-1">
                <span>Tiempo total estimado para {totalEstimate} contactos:</span>
                <strong>~{estimatedMinutes} minutos</strong>
              </div>
            </div>

            {/* Botón de Lanzamiento */}
            <button
              onClick={() => createCampaignMutation.mutate()}
              disabled={createCampaignMutation.isPending || !campaignName.trim() || totalEstimate === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition"
            >
              {createCampaignMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Iniciando Campaña...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Iniciar Campaña con Goteo Seguro ({totalEstimate} contactos)
                </>
              )}
            </button>
          </div>

          {/* ── COLUMNA DERECHA: VISTA PREVIA Y MUESTRA (5 Cols) ──────────────── */}
          <div className="lg:col-span-5 space-y-6">
            {/* Vista Previa Interactiva de WhatsApp */}
            <div className="bg-slate-900 rounded-2xl p-4 shadow-xl text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                    W
                  </div>
                  <div>
                    <h5 className="text-xs font-bold leading-tight">Vista Previa WhatsApp</h5>
                    <p className="text-[10px] text-slate-400">Así lo verá el cliente en su celular</p>
                  </div>
                </div>
                <Eye className="w-4 h-4 text-slate-400" />
              </div>

              {/* Pantalla de Chat WhatsApp */}
              <div
                className="rounded-xl p-4 min-h-[220px] flex flex-col justify-end"
                style={{ backgroundColor: '#0B141A' }}
              >
                <div className="bg-[#005C4B] text-white p-3 rounded-lg rounded-tr-none text-xs leading-relaxed max-w-[90%] self-end shadow">
                  {mediaUrl && (
                    <div className="mb-2 p-2 bg-black/20 rounded border border-white/10 flex items-center gap-2 text-[11px]">
                      {mediaType === 'IMAGE' ? (
                        <ImageIcon className="w-4 h-4 text-emerald-300" />
                      ) : (
                        <FileText className="w-4 h-4 text-red-300" />
                      )}
                      <span className="truncate">{mediaFilename || 'Archivo adjunto'}</span>
                    </div>
                  )}

                  <p className="whitespace-pre-line">
                    {messageTemplate
                      .replace(/\{\{\s*nombre\s*\}\}/gi, 'Carlos')
                      .replace(/\{\{\s*name\s*\}\}/gi, 'Carlos')
                      .replace(/\{\{\s*producto\s*\}\}/gi, 'Kit de Biología')
                      .replace(/\{\{\s*product\s*\}\}/gi, 'Kit de Biología')}
                  </p>

                  <div className="text-[9px] text-emerald-200 text-right mt-1.5 flex items-center justify-end gap-1">
                    <span>14:32</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-300 inline" />
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2.5 bg-slate-800/80 rounded-lg text-[11px] text-slate-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Opción 1 Activa:</strong> Si Carlos responde a este mensaje, el bot
                  reconocerá el regalo o producto ofrecido y responderá con contexto pleno.
                </span>
              </div>
            </div>

            {/* Muestra de Contactos Destinatarios */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-gray-800 flex items-center justify-between">
                <span>Destinatarios de Muestra ({totalEstimate})</span>
                <span className="text-[10px] text-gray-400">Primeros 10</span>
              </h4>

              {audienceEstimate?.sampleContacts && audienceEstimate.sampleContacts.length > 0 ? (
                <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                  {audienceEstimate.sampleContacts.map((c) => (
                    <div key={c.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-gray-800">{c.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{c.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {c.leadStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-6">
                  No hay contactos que coincidan con estos filtros.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── PESTAÑA: MONITOR DE CAMPAÑAS ──────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Historial y Campañas Activas</h3>
            <button
              onClick={() => refetchCampaigns()}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </button>
          </div>

          {isLoadingCampaigns ? (
            <LoadingSkeleton rows={4} />
          ) : campaigns.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
              <EmptyState
                title="No hay campañas registradas"
                description="Crea tu primera campaña de difusión con goteo seguro en la pestaña 'Nueva Campaña'."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4 hover:border-blue-300 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-gray-900">{c.name}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            c.status === 'RUNNING'
                              ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                              : c.status === 'PAUSED'
                              ? 'bg-amber-100 text-amber-800'
                              : c.status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {c.status === 'RUNNING'
                            ? 'En Goteo'
                            : c.status === 'PAUSED'
                            ? 'Pausada'
                            : c.status === 'COMPLETED'
                            ? 'Completada'
                            : c.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Iniciada: {new Date(c.createdAt).toLocaleString('es-VE')} · Canal: {c.channel}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1">
                      {c.status === 'RUNNING' && (
                        <button
                          onClick={() => pauseMutation.mutate(c.id)}
                          className="p-1.5 hover:bg-amber-50 text-amber-700 rounded-lg border border-amber-200"
                          title="Pausar goteo"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {c.status === 'PAUSED' && (
                        <button
                          onClick={() => resumeMutation.mutate(c.id)}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200"
                          title="Reanudar goteo"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(c.status === 'RUNNING' || c.status === 'PAUSED') && (
                        <button
                          onClick={() => cancelMutation.mutate(c.id)}
                          className="p-1.5 hover:bg-red-50 text-red-700 rounded-lg border border-red-200"
                          title="Cancelar definitivamente"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progreso */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-600">Progreso de Entrega:</span>
                      <span className="text-blue-600">
                        {c.sentCount} / {c.totalRecipients} ({c.progressPercentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          c.status === 'COMPLETED' ? 'bg-blue-600' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${c.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Estadísticas de Entrega */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase">Total</p>
                      <p className="text-xs font-black text-gray-800">{c.totalRecipients}</p>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg">
                      <p className="text-[10px] text-emerald-600 font-semibold uppercase">Enviados</p>
                      <p className="text-xs font-black text-emerald-700">{c.sentCount}</p>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg">
                      <p className="text-[10px] text-red-600 font-semibold uppercase">Fallidos</p>
                      <p className="text-xs font-black text-red-700">{c.failedCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
