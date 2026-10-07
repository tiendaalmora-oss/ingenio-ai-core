'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import {
  BadgeDollarSign,
  Calendar,
  Filter,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  TrendingUp,
  Search,
  RefreshCw,
  Download,
  Phone,
  MessageSquare,
  FileText,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
  User
} from 'lucide-react';
import Link from 'next/link';
import LeadDetailDrawer from '@/features/crm/LeadDetailDrawer';

interface SaleItem {
  id: string;
  clientName: string;
  phone: string;
  products: string[];
  primaryProduct: string;
  amount: number;
  amountFormatted: string;
  currency: 'BS' | 'USD';
  paymentMethod: string;
  reference: string | null;
  saleTimestamp: string;
  saleDate: string;
  conversationId: string | null;
  hasReceipt: boolean;
  receiptSnippet?: string | null;
}

interface SalesDashboardData {
  filter: {
    mode: 'day' | 'range' | 'all';
    selectedDate: string;
    startDate?: string;
    endDate?: string;
    product?: string;
    search?: string;
  };
  summary: {
    totalSales: number;
    totalRevenueBs: number;
    totalRevenueUsd: number;
    averageTicketBs: number;
    topProduct: string;
    verifiedReceiptsCount: number;
  };
  byProduct: Array<{
    name: string;
    salesCount: number;
    revenueBs: number;
    revenueUsd: number;
    percentage: number;
  }>;
  byPaymentMethod: Array<{
    method: string;
    salesCount: number;
    percentage: number;
  }>;
  sales: SaleItem[];
  availableProducts: string[];
  recentSaleDates: string[];
}

export default function SalesDashboardPage() {
  // Preset de fechas: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'all' | 'custom'
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'last7' | 'thisMonth' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSaleModal, setActiveSaleModal] = useState<SaleItem | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Calcular parámetros de fecha según el preset
  const dateParams = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (datePreset === 'today') {
      return { date: todayStr };
    }
    if (datePreset === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      return { date: yest.toISOString().split('T')[0] };
    }
    if (datePreset === 'last7') {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
    }
    if (datePreset === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
    }
    if (datePreset === 'all') {
      return { date: 'all' };
    }
    if (datePreset === 'custom') {
      if (customStartDate && customEndDate) {
        return { startDate: customStartDate, endDate: customEndDate };
      }
      return { date: customDate || todayStr };
    }
    return { date: todayStr };
  }, [datePreset, customDate, customStartDate, customEndDate]);

  // Consulta API con React Query
  const { data, isLoading, isError, refetch, isFetching } = useQuery<SalesDashboardData>({
    queryKey: ['sales-dashboard', dateParams, selectedProduct, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateParams.date) params.append('date', dateParams.date);
      if (dateParams.startDate) params.append('startDate', dateParams.startDate);
      if (dateParams.endDate) params.append('endDate', dateParams.endDate);
      if (selectedProduct && selectedProduct !== 'all') params.append('product', selectedProduct);
      if (searchTerm) params.append('search', searchTerm);

      const res = await api.get(`/analytics/sales?${params.toString()}`);
      return res.data;
    },
    refetchOnWindowFocus: false,
  });

  const summary = data?.summary;
  const sales = data?.sales || [];
  const byProduct = data?.byProduct || [];
  const byPaymentMethod = data?.byPaymentMethod || [];
  const availableProducts = data?.availableProducts || [];
  const recentSaleDates = data?.recentSaleDates || [];

  // Exportar a CSV
  const exportToCsv = () => {
    if (!sales.length) return;
    const headers = ['Fecha/Hora', 'Cliente', 'Teléfono', 'Producto', 'Monto', 'Moneda', 'Método', 'Referencia'];
    const rows = sales.map((s) => [
      `"${s.saleTimestamp}"`,
      `"${s.clientName.replace(/"/g, '""')}"`,
      `"${s.phone}"`,
      `"${s.primaryProduct.replace(/"/g, '""')}"`,
      s.amount,
      s.currency,
      `"${s.paymentMethod.replace(/"/g, '""')}"`,
      `"${s.reference || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ventas_${data?.filter.selectedDate || 'reporte'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageContainer maxWidth="max-w-[1600px]">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Tablero de Ventas del Día"
        description="Seguimiento de ingresos, comprobantes bancarios verificados y ventas cerradas por producto y fecha."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCsv}
              disabled={sales.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        }
      />

      {/* ── FILTERS BAR ──────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs mb-6 space-y-3">
        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setDatePreset('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                datePreset === 'today'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setDatePreset('yesterday')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                datePreset === 'yesterday'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ayer
            </button>
            <button
              onClick={() => setDatePreset('last7')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                datePreset === 'last7'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => setDatePreset('thisMonth')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                datePreset === 'thisMonth'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Este mes
            </button>
            <button
              onClick={() => setDatePreset('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                datePreset === 'all'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Histórico Completo
            </button>
            <button
              onClick={() => setDatePreset('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1 ${
                datePreset === 'custom'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Personalizado
            </button>
          </div>

          {/* Product Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
              Producto:
            </span>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="text-xs font-medium bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los Productos</option>
              {availableProducts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Inputs & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          {datePreset === 'custom' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Día específico:</span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-gray-800"
              />
              <span className="text-xs text-gray-400 font-medium px-1">ó Rango:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                placeholder="Inicio"
                className="text-xs bg-white border border-gray-300 rounded-lg px-2 py-1 text-gray-800"
              />
              <span className="text-xs text-gray-400">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                placeholder="Fin"
                className="text-xs bg-white border border-gray-300 rounded-lg px-2 py-1 text-gray-800"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>
                Periodo activo:{' '}
                <strong className="text-gray-800">
                  {datePreset === 'today' && 'Hoy (' + (data?.filter.selectedDate || customDate) + ')'}
                  {datePreset === 'yesterday' && 'Ayer'}
                  {datePreset === 'last7' && 'Últimos 7 días'}
                  {datePreset === 'thisMonth' && 'Mes en curso'}
                  {datePreset === 'all' && 'Todo el historial'}
                </strong>
              </span>
            </div>
          )}

          {/* Quick Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente, teléfono, ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton rows={3} />
          <LoadingSkeleton rows={5} />
        </div>
      ) : isError || !data ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <EmptyState
            title="Error al consultar el tablero de ventas"
            description="No se pudieron recuperar las transacciones. Verifica la conexión con el servidor central."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── TOP KPI CARDS ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Facturado en Bs */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Facturado (Bs)
                </p>
                <h3 className="text-2xl font-black text-green-600 mt-1">
                  {summary?.totalRevenueBs.toLocaleString('es-VE')} Bs
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">En el periodo seleccionado</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
                <BadgeDollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Total Ventas Concretadas */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Ventas Concretadas
                </p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">
                  {summary?.totalSales || 0}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Clientes que confirmaron pago</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Ticket Promedio */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Ticket Promedio
                </p>
                <h3 className="text-2xl font-black text-purple-600 mt-1">
                  {summary?.averageTicketBs ? `${summary.averageTicketBs.toLocaleString('es-VE')} Bs` : '0 Bs'}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Promedio por transacción</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* Comprobantes Auditados */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Comprobantes con OCR
                </p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">
                  {summary?.verifiedReceiptsCount || 0} / {summary?.totalSales || 0}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Auditados automáticamente</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* ── BANNER SI NO HAY VENTAS EN EL DÍA SELECCIONADO ─────────────────── */}
          {sales.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  No se registran ventas para este filtro específico
                </h4>
                <p className="text-xs text-amber-700 mt-1">
                  Puedes explorar las ventas registradas en días anteriores con un solo clic:
                </p>
              </div>
              {recentSaleDates.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-amber-800">Días con ventas:</span>
                  {recentSaleDates.slice(0, 4).map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDatePreset('custom');
                        setCustomDate(d);
                      }}
                      className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-800 hover:bg-amber-100 transition shadow-2xs"
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    onClick={() => setDatePreset('all')}
                    className="px-2.5 py-1 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 transition"
                  >
                    Ver Todo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── DESGLOSE POR PRODUCTO Y MÉTODOS DE PAGO ───────────────────────── */}
          {sales.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Desglose por Producto (2 cols) */}
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    Ventas por Producto
                  </h3>
                  <span className="text-xs text-gray-500 font-medium">
                    {byProduct.length} {byProduct.length === 1 ? 'producto activo' : 'productos activos'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {byProduct.map((p) => (
                    <div
                      key={p.name}
                      className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-white hover:border-blue-200 transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">
                          {p.name}
                        </h4>
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          {p.percentage}%
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1 border-t border-gray-200/60 text-xs">
                        <span className="font-semibold text-gray-600">
                          {p.salesCount} {p.salesCount === 1 ? 'venta' : 'ventas'}
                        </span>
                        <span className="font-black text-green-700">
                          {p.revenueBs > 0 ? `${p.revenueBs.toLocaleString('es-VE')} Bs` : `$${p.revenueUsd}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose por Método de Pago (1 col) */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    Métodos de Pago
                  </h3>
                </div>

                <div className="space-y-2.5 pt-1">
                  {byPaymentMethod.map((m) => (
                    <div
                      key={m.method}
                      className="p-2.5 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-between text-xs"
                    >
                      <div className="truncate max-w-[65%]">
                        <p className="font-bold text-gray-800 truncate">{m.method}</p>
                        <p className="text-[10px] text-gray-400">{m.salesCount} comprobantes</p>
                      </div>
                      <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                        {m.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TABLA DETALLADA DE VENTAS ─────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BadgeDollarSign className="w-5 h-5 text-green-600" />
                  Listado Detallado de Ventas ({sales.length})
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Registros procesados y validados por el bot con información bancaria asociada.
                </p>
              </div>
            </div>

            {sales.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No hay ventas que coincidan con los filtros establecidos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Fecha / Hora</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Producto Adquirido</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                      <th className="py-3 px-4">Método / Referencia</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sales.map((sale) => (
                      <tr key={sale.id + sale.saleTimestamp} className="hover:bg-blue-50/30 transition">
                        {/* Fecha / Hora */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-bold text-gray-900">
                            {new Date(sale.saleTimestamp).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {new Date(sale.saleTimestamp).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </td>

                        {/* Cliente */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">{sale.clientName}</div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{sale.phone}</span>
                          </div>
                        </td>

                        {/* Producto */}
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-md border border-blue-100 text-xs">
                            {sale.primaryProduct}
                          </span>
                        </td>

                        {/* Monto */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="font-black text-sm text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                            {sale.amountFormatted}
                          </span>
                        </td>

                        {/* Método / Referencia */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-800 text-xs flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            {sale.paymentMethod}
                          </div>
                          {sale.reference ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-bold mt-0.5">
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              Ref: #{sale.reference}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Sin ref. explícita</span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {sale.hasReceipt && (
                              <button
                                onClick={() => setActiveSaleModal(sale)}
                                title="Ver comprobante auditado"
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <FileText className="w-3 h-3 text-amber-600" />
                                Comprobante
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedLeadId(sale.id)}
                              title="Abrir ficha del cliente en CRM para editar etiquetas, anular o corregir venta"
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <User className="w-3 h-3 text-blue-600" />
                              Ficha / Corregir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE DE COMPROBANTE AUDITADO ────────────────────────────── */}
      {activeSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Comprobante de Pago Validado</h3>
                  <p className="text-[11px] text-gray-500">Auditado por Visión Artificial de Hermes</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSaleModal(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Cliente:</span>
                  <strong className="text-gray-900">{activeSaleModal.clientName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Teléfono:</span>
                  <strong className="text-gray-900">{activeSaleModal.phone}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Producto:</span>
                  <strong className="text-blue-700">{activeSaleModal.primaryProduct}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monto:</span>
                  <strong className="text-green-700 font-bold">{activeSaleModal.amountFormatted}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Entidad / Banco:</span>
                  <strong className="text-gray-900">{activeSaleModal.paymentMethod}</strong>
                </div>
                {activeSaleModal.reference && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">N° Referencia:</span>
                    <strong className="text-gray-900 font-mono">#{activeSaleModal.reference}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha de Registro:</span>
                  <span className="text-gray-700">
                    {new Date(activeSaleModal.saleTimestamp).toLocaleString('es-ES')}
                  </span>
                </div>
              </div>

              {activeSaleModal.receiptSnippet && (
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                  <p className="text-[10px] uppercase font-bold text-amber-800 mb-1">
                    Lectura OCR Original del Soporte:
                  </p>
                  <p className="text-[11px] text-amber-950 font-mono leading-relaxed bg-white/70 p-2 rounded border border-amber-100">
                    {activeSaleModal.receiptSnippet}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <Link
                href={`https://wa.me/${activeSaleModal.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Contactar en WhatsApp
              </Link>
              <button
                onClick={() => setActiveSaleModal(null)}
                className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER DE DETALLE DEL LEAD PARA CORRECCIONES EN VIVO ─────────────── */}
      <LeadDetailDrawer
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />
    </PageContainer>
  );
}
