'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import {
  TrendingUp,
  Users,
  Flame,
  CheckCircle2,
  DollarSign,
  Repeat,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Tag,
  MessageSquare,
  BarChart3,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

interface AnalyticsData {
  funnel: {
    totalLeads: number;
    cold: number;
    warm: number;
    hot: number;
    closed: number;
    handoff: number;
    conversionRate: number;
  };
  products: Array<{
    name: string;
    price: string;
    totalInquiries: number;
    warm: number;
    hot: number;
    closed: number;
    conversionRate: number;
    estimatedRevenue: number;
  }>;
  followUps: {
    totalSent: number;
    pending: number;
    respondedCount: number;
    reactivationRate: number;
  };
  topTags: Array<{ tag: string; count: number }>;
  topObjections: Array<{ objection: string; count: number }>;
  dailyVolume: Array<{ date: string; inbound: number; outbound: number }>;
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<AnalyticsData>({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const res = await api.get('/analytics/summary');
      return res.data;
    },
    refetchOnWindowFocus: false,
  });

  const funnel = data?.funnel;
  const products = data?.products || [];
  const followUps = data?.followUps;
  const topTags = data?.topTags || [];
  const topObjections = data?.topObjections || [];
  const dailyVolume = data?.dailyVolume || [];

  return (
    <PageContainer maxWidth="max-w-[1600px]">
      {/* Header */}
      <PageHeader
        title="Analítica Comercial & Conversiones"
        description="Métricas en tiempo real del embudo de ventas, rendimiento por producto y efectividad de seguimientos con IA."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/crm"
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
            >
              Ver Leads en CRM
            </Link>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton rows={4} />
          <LoadingSkeleton rows={6} />
        </div>
      ) : isError || !data ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <EmptyState
            title="No se pudieron cargar las analíticas"
            description="Asegúrate de que el backend esté operativo y vuelve a intentarlo."
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── TOP KPI CARDS ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Leads */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Prospectos</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{funnel?.totalLeads || 0}</h3>
                <p className="text-[11px] text-gray-400 mt-1">Registrados en CRM</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Hot Leads */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Oportunidades Calientes</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{funnel?.hot || 0}</h3>
                <p className="text-[11px] text-amber-600/80 mt-1 font-medium">Listos para transferir / Cierre</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Flame className="w-6 h-6" />
              </div>
            </div>

            {/* Closed / Ventas */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ventas Concretadas</p>
                <h3 className="text-2xl font-bold text-green-600 mt-1">{funnel?.closed || 0}</h3>
                <p className="text-[11px] text-green-600/80 mt-1 font-medium">Pagos confirmados</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tasa de Conversión</p>
                <h3 className="text-2xl font-bold text-purple-600 mt-1">{funnel?.conversionRate || 0}%</h3>
                <p className="text-[11px] text-purple-600/80 mt-1 font-medium">Leads cerrados / Total</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* ── EMBUDO DE VENTAS VISUAL ───────────────────────────────────────── */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Embudo de Conversión Comercial (Sales Funnel)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Distribución de prospectos por nivel de madurez y avance en el proceso de compra.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg">
                Total: {funnel?.totalLeads || 0} Prospectos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              {/* Cold */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>❄️ Contacto Inicial (Cold)</span>
                  <span>{funnel?.totalLeads ? Math.round(((funnel.cold) / funnel.totalLeads) * 100) : 0}%</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">{funnel?.cold || 0}</div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-500 h-full rounded-full transition-all"
                    style={{ width: `${funnel?.totalLeads ? (funnel.cold / funnel.totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">Curiosidad o saludo inicial</p>
              </div>

              {/* Warm */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-700">
                  <span>🌤️ Interesados (Warm)</span>
                  <span>{funnel?.totalLeads ? Math.round(((funnel.warm) / funnel.totalLeads) * 100) : 0}%</span>
                </div>
                <div className="text-2xl font-bold text-blue-800">{funnel?.warm || 0}</div>
                <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${funnel?.totalLeads ? (funnel.warm / funnel.totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[11px] text-blue-600">Preguntaron beneficios o precio</p>
              </div>

              {/* Hot */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-700">
                  <span>🔥 Listos para Pagar (Hot)</span>
                  <span>{funnel?.totalLeads ? Math.round(((funnel.hot) / funnel.totalLeads) * 100) : 0}%</span>
                </div>
                <div className="text-2xl font-bold text-amber-800">{funnel?.hot || 0}</div>
                <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded-full transition-all"
                    style={{ width: `${funnel?.totalLeads ? (funnel.hot / funnel.totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[11px] text-amber-600">Solicitaron cuenta / transferencia</p>
              </div>

              {/* Closed */}
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-green-700">
                  <span>💰 Venta Concretada (Closed)</span>
                  <span>{funnel?.totalLeads ? Math.round(((funnel.closed) / funnel.totalLeads) * 100) : 0}%</span>
                </div>
                <div className="text-2xl font-bold text-green-800">{funnel?.closed || 0}</div>
                <div className="w-full bg-green-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-green-600 h-full rounded-full transition-all"
                    style={{ width: `${funnel?.totalLeads ? (funnel.closed / funnel.totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[11px] text-green-600">Pago confirmado y acceso listo</p>
              </div>
            </div>
          </div>

          {/* ── RENDIMIENTO POR PRODUCTO & SEGUIMIENTOS ────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Rendimiento por Producto (2/3) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                  Rendimiento por Producto (Kits Digitales)
                </h3>
                <Link
                  href="/business-studio"
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Gestionar Productos &rarr;
                </Link>
              </div>

              {products.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">
                  No hay productos registrados en el Business Studio aún.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {products.map((prod, idx) => (
                    <div
                      key={prod.name + idx}
                      className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-sm transition space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{prod.name}</h4>
                          <span className="inline-block mt-0.5 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                            {prod.price}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          {prod.conversionRate}% Cierre
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 text-center">
                        <div className="bg-white p-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Consultas</p>
                          <p className="text-sm font-bold text-gray-800">{prod.totalInquiries}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-amber-600 uppercase font-bold">Calientes</p>
                          <p className="text-sm font-bold text-amber-700">{prod.hot}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-green-600 uppercase font-bold">Ventas</p>
                          <p className="text-sm font-bold text-green-700">{prod.closed}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Efectividad del Motor de Seguimientos (1/3) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-blue-600" />
                  Motor de Seguimientos IA
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Reactivación automática de prospectos inactivos.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-900 font-semibold">Tasa de Reactivación</p>
                    <p className="text-[11px] text-blue-600">Respondieron tras seguimiento</p>
                  </div>
                  <span className="text-xl font-bold text-blue-700">
                    {followUps?.reactivationRate || 0}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">Enviados</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{followUps?.totalSent || 0}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">Reactivados</p>
                    <p className="text-lg font-bold text-green-700 mt-0.5">{followUps?.respondedCount || 0}</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs text-gray-600">
                  <span>Seguimientos en cola:</span>
                  <span className="font-bold text-gray-900">{followUps?.pending || 0} pendientes</span>
                </div>
              </div>
            </div>

          </div>

          {/* ── OBJECTIONS & TOP TAGS ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Tags */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Tag className="w-5 h-5 text-purple-600" />
                Etiquetas Comerciales Más Frecuentes
              </h3>
              {topTags.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Sin etiquetas registradas aún.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {topTags.map((t) => (
                    <span
                      key={t.tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg"
                    >
                      {t.tag}
                      <span className="bg-purple-200 text-purple-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                        {t.count}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Top Objections */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                Dudas y Objeciones Detectadas por la IA
              </h3>
              {topObjections.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Sin objeciones detectadas aún.</p>
              ) : (
                <div className="space-y-2 pt-1">
                  {topObjections.map((o) => (
                    <div
                      key={o.objection}
                      className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-amber-900 truncate max-w-[80%]">{o.objection}</span>
                      <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        {o.count} {o.count === 1 ? 'vez' : 'veces'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── DAILY VOLUME (Últimos 7 días) ─────────────────────────────────── */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Volumen de Mensajes Diarios (WhatsApp)
              </h3>
              <span className="text-xs text-gray-400">Últimos 7 días</span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-2">
              {dailyVolume.map((d) => (
                <div
                  key={d.date}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center space-y-1"
                >
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{d.date}</p>
                  <div className="flex items-center gap-2 text-xs font-bold mt-1">
                    <span className="text-blue-600" title="Entrantes (Clientes)">📥 {d.inbound}</span>
                    <span className="text-purple-600" title="Salientes (Hermes)">📤 {d.outbound}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">Total: {d.inbound + d.outbound}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
