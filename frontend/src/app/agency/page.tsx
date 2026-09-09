'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import api from '@/services/api';
import {
  Building2,
  Plus,
  Users,
  CheckCircle,
  PauseCircle,
  XCircle,
  ChevronRight,
  BarChart2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Settings,
  MessageSquare,
  ExternalLink,
  Smartphone,
  QrCode,
  LogOut,
  RefreshCw,
  Lock,
  X,
  Check,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────

interface Agency {
  id: string;
  name: string;
  ownerEmail: string;
  plan: string;
  createdAt: string;
  _count: { subaccounts: number };
}

interface Subaccount {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'suspended';
  plan: string;
  createdAt: string;
  wahaSession?: string;
  _count: { contacts: number };
}

// ── Badge de estado ───────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; Icon: any }> = {
    active:    { label: 'Activa',     className: 'bg-green-50 text-green-700 border-green-200',  Icon: CheckCircle },
    paused:    { label: 'Pausada',    className: 'bg-yellow-50 text-yellow-700 border-yellow-200', Icon: PauseCircle },
    suspended: { label: 'Suspendida', className: 'bg-red-50 text-red-700 border-red-200',        Icon: XCircle },
  };
  const { label, className, Icon } = map[status] ?? map['active'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

// ── Badge de plan ─────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free:       'bg-gray-100 text-gray-600',
    starter:    'bg-blue-50 text-blue-700',
    pro:        'bg-purple-50 text-purple-700',
    enterprise: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${colors[plan] ?? colors['starter']}`}>
      {plan}
    </span>
  );
}

// ── Página principal ──────────────────────────────────────────

export default function AgencyPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [selected, setSelected] = useState<Agency | null>(null);
  const [subaccounts, setSubaccounts] = useState<Subaccount[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Modal crear agencia
  const [showNewAgency, setShowNewAgency] = useState(false);
  const [newAgency, setNewAgency] = useState({ name: '', ownerEmail: '', plan: 'free' });

  // Modal crear subcuenta
  const [showNewSub, setShowNewSub] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', plan: 'starter' });
  const [saving, setSaving] = useState(false);

  // Modal WhatsApp
  const [wahaModalSub, setWahaModalSub] = useState<Subaccount | null>(null);

  // ── Cargar agencias y cuenta principal ────────────────────

  useEffect(() => {
    fetchAgencies();
  }, []);

  async function fetchAgencies() {
    setLoading(true);
    try {
      const { data } = await api.get('/agency/overview');
      const loadedAgencies: Agency[] = Array.isArray(data?.agencies) ? data.agencies : [];
      const loadedUnassigned = Array.isArray(data?.unassignedTenants) ? data.unassignedTenants : [];
      
      setAgencies(loadedAgencies);
      setUnassigned(loadedUnassigned);

      // Auto-seleccionar la primera agencia si no hay ninguna seleccionada
      if (loadedAgencies.length > 0 && !selected) {
        selectAgency(loadedAgencies[0]);
      }
    } catch {
      try {
        const { data } = await api.get('/agency');
        setAgencies(Array.isArray(data) ? data : []);
      } catch {
        setAgencies([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function selectAgency(agency: Agency) {
    setSelected(agency);
    setLoadingSubs(true);
    try {
      const [subRes, statsRes] = await Promise.all([
        api.get(`/agency/${agency.id}/subaccounts`),
        api.get(`/agency/${agency.id}/stats`),
      ]);
      setSubaccounts(subRes.data);
      setStats(statsRes.data);
    } catch {
      setSubaccounts([]);
    } finally {
      setLoadingSubs(false);
    }
  }

  // ── Crear agencia ─────────────────────────────────────────

  async function handleCreateAgency(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/agency', newAgency);
      setShowNewAgency(false);
      setNewAgency({ name: '', ownerEmail: '', plan: 'free' });
      fetchAgencies();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al crear la agencia');
    } finally {
      setSaving(false);
    }
  }

  // ── Crear subcuenta ───────────────────────────────────────

  async function handleCreateSubaccount(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await api.post(`/agency/${selected.id}/subaccounts`, newSub);
      setShowNewSub(false);
      setNewSub({ name: '', plan: 'starter' });
      selectAgency(selected);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al crear la subcuenta');
    } finally {
      setSaving(false);
    }
  }

  // ── Cambiar estado subcuenta ─────────────────────────────

  async function handleStatusChange(tenantId: string, status: 'active' | 'paused' | 'suspended') {
    try {
      await api.patch(`/agency/subaccounts/${tenantId}/status`, { status });
    } catch {
      alert('Error al cambiar el estado');
    }
    if (selected) selectAgency(selected);
  }

  const PRIMARY_PROD_ID = 'dba1c54c-89c6-41e9-ae9d-03613377a5b3';
  const prodAccount = unassigned.find(u => u.id === PRIMARY_PROD_ID) 
    || agencies.flatMap(a => a.subaccounts || []).find(s => s.id === PRIMARY_PROD_ID)
    || (unassigned.length > 0 ? unassigned[0] : null);

  return (
    <PageContainer maxWidth="max-w-[1600px]">
      <PageHeader
        title="Panel de Agencia"
        description="Gestiona agencias y subcuentas (clientes) al estilo GoHighLevel"
        actions={
          <button
            onClick={() => setShowNewAgency(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nueva Agencia
          </button>
        }
      />

      {/* ── Banner: Cuenta Principal de Producción (Blindada) ── */}
      {prodAccount && (
        <div className="mb-6 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-gray-900">
                  {prodAccount.name || 'Kits Docentes Venezuela'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  🟢 OPERATIVA EN VIVO
                </span>
                <span className="text-xs text-gray-500 font-mono bg-white px-2 py-0.5 rounded border">
                  WAHA: ferreos
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                Esta es tu cuenta principal en funcionamiento. Las subcuentas y clientes creados en las agencias están 100% aisladas y no alteran esta cuenta ni sus datos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => {
                localStorage.setItem('tenant_id', prodAccount.id);
                window.location.href = '/dashboard';
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <BarChart2 className="w-3.5 h-3.5" /> Ver CRM Producción
            </button>
            <button
              onClick={() => {
                localStorage.setItem('tenant_id', prodAccount.id);
                window.location.href = '/business-studio';
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-gray-700 border border-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
            >
              <Settings className="w-3.5 h-3.5 text-gray-500" /> Business Studio
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Columna izquierda: Lista de Agencias ── */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
            Agencias ({agencies.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : agencies.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No hay agencias aún.</p>
              <button
                onClick={() => setShowNewAgency(true)}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Crear la primera agencia
              </button>
            </div>
          ) : (
            agencies.map((ag) => (
              <button
                key={ag.id}
                onClick={() => selectAgency(ag)}
                className={`w-full text-left bg-white border rounded-xl p-4 transition-all hover:shadow-md ${
                  selected?.id === ag.id
                    ? 'border-blue-500 shadow-md ring-2 ring-blue-100'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-900 truncate">{ag.name}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
                <p className="text-xs text-gray-500 truncate mb-2">{ag.ownerEmail}</p>
                <div className="flex items-center gap-2">
                  <PlanBadge plan={ag.plan} />
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Users className="w-3 h-3" /> {ag._count.subaccounts} subcuentas
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* ── Columna derecha: Subcuentas ── */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400">Selecciona una agencia para ver sus subcuentas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header de la agencia seleccionada */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                    <p className="text-sm text-gray-500">{selected.ownerEmail}</p>
                  </div>
                  <button
                    onClick={() => setShowNewSub(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Nueva Subcuenta
                  </button>
                </div>

                {/* Stats */}
                {stats && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Total Subcuentas', value: stats.totalSubaccounts, Icon: Building2 },
                      { label: 'Activas', value: stats.activeSubaccounts, Icon: CheckCircle },
                      { label: 'Contactos Totales', value: stats.totalContacts, Icon: Users },
                    ].map(({ label, value, Icon }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                        <Icon className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                        <div className="text-xl font-bold text-gray-900">{value}</div>
                        <div className="text-xs text-gray-500">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de subcuentas */}
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
                Subcuentas de {selected.name} ({subaccounts.length})
              </h3>

              {loadingSubs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : subaccounts.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Esta agencia no tiene subcuentas aún.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subaccounts.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:shadow-xs transition-shadow"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-900 truncate">{sub.name}</span>
                          <StatusBadge status={sub.status} />
                          <PlanBadge plan={sub.plan} />
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {sub._count?.contacts ?? 0} contactos ·{' '}
                          Creada {new Date(sub.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Acciones rápidas enriquecidas */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Conectar / Gestionar WhatsApp */}
                        <button
                          onClick={() => setWahaModalSub(sub)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                            sub.id === 'dba1c54c-89c6-41e9-ae9d-03613377a5b3' || sub.wahaSession === 'ferreos'
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold'
                              : 'bg-green-50 hover:bg-green-100 text-green-700'
                          }`}
                          title="Gestionar conexión de WhatsApp y código QR"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          {sub.id === 'dba1c54c-89c6-41e9-ae9d-03613377a5b3' || sub.wahaSession === 'ferreos' ? 'WA En Vivo' : 'WhatsApp'}
                        </button>

                        {/* Ir al Business Studio del cliente */}
                        <button
                          onClick={() => {
                            localStorage.setItem('tenant_id', sub.id);
                            window.location.href = '/business-studio';
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors flex items-center gap-1"
                          title="Editar base de conocimiento y bot de este cliente"
                        >
                          <Settings className="w-3 h-3 text-gray-500" /> Bot
                        </button>

                        {/* Ir al WhatsApp Hub del cliente */}
                        <button
                          onClick={() => {
                            localStorage.setItem('tenant_id', sub.id);
                            window.location.href = '/conversations';
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition-colors flex items-center gap-1"
                          title="Ver chats de WhatsApp de este cliente"
                        >
                          <MessageSquare className="w-3 h-3" /> Chats
                        </button>

                        {/* Ir al CRM / Dashboard del cliente */}
                        <button
                          onClick={() => {
                            localStorage.setItem('tenant_id', sub.id);
                            window.location.href = '/dashboard';
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition-colors flex items-center gap-1"
                          title="Ver métricas de este cliente"
                        >
                          <BarChart2 className="w-3 h-3" /> CRM
                        </button>

                        {/* Pausar / Activar */}
                        {sub.status !== 'active' ? (
                          <button
                            onClick={() => handleStatusChange(sub.id, 'active')}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
                          >
                            Activar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(sub.id, 'paused')}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium transition-colors"
                          >
                            Pausar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Nueva Agencia ── */}
      {showNewAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nueva Agencia</h3>
            <form onSubmit={handleCreateAgency} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={newAgency.name}
                  onChange={e => setNewAgency(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Agencia Acme"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email del dueño</label>
                <input
                  type="email"
                  required
                  value={newAgency.ownerEmail}
                  onChange={e => setNewAgency(p => ({ ...p, ownerEmail: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="dueño@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={newAgency.plan}
                  onChange={e => setNewAgency(p => ({ ...p, plan: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewAgency(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear Agencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Nueva Subcuenta ── */}
      {showNewSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Nueva Subcuenta</h3>
            <p className="text-sm text-gray-500 mb-4">Para la agencia: <strong>{selected?.name}</strong></p>
            <form onSubmit={handleCreateSubaccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del cliente</label>
                <input
                  type="text"
                  required
                  value={newSub.name}
                  onChange={e => setNewSub(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Restaurante El Buen Sabor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={newSub.plan}
                  onChange={e => setNewSub(p => ({ ...p, plan: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Nota de Aislamiento */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Aislamiento Garantizado:</strong> Esta subcuenta se creará con su propio catálogo, reglas de bot y base de datos de contactos 100% aislados.
                </span>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSub(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear Subcuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Conexión WhatsApp (WAHA) ── */}
      {wahaModalSub && (
        <WahaModal sub={wahaModalSub} onClose={() => setWahaModalSub(null)} />
      )}
    </PageContainer>
  );
}

// ── Componente: Modal de Conexión WAHA por Subcuenta ─────────

interface WahaStatusData {
  session: string;
  status: 'WORKING' | 'SCAN_QR_CODE' | 'STARTING' | 'STOPPED' | 'NOT_CONFIGURED' | 'OFFLINE' | 'ERROR' | string;
  phone?: string | null;
  pushName?: string | null;
  isProtected?: boolean;
  error?: string;
}

function WahaModal({
  sub,
  onClose,
}: {
  sub: Subaccount;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [wahaData, setWahaData] = useState<WahaStatusData | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const fetchStatus = async () => {
    try {
      setErrorMsg(null);
      const res = await api.get(`/agency/subaccounts/${sub.id}/waha/status`);
      setWahaData(res.data);

      if (res.data.status === 'SCAN_QR_CODE' || res.data.status === 'STARTING') {
        fetchQr();
      } else {
        setQrImage(null);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Error consultando estado de WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const fetchQr = async () => {
    try {
      const res = await api.get(`/agency/subaccounts/${sub.id}/waha/qr`);
      if (res.data.qr) {
        setQrImage(res.data.qr);
      }
      if (res.data.status === 'WORKING') {
        setQrImage(null);
        setWahaData(prev => prev ? { ...prev, status: 'WORKING' } : null);
      }
    } catch {
      /* silencioso en polling */
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [sub.id]);

  // Polling cada 3.5 segundos si está esperando QR
  useEffect(() => {
    if (!wahaData || (wahaData.status !== 'SCAN_QR_CODE' && wahaData.status !== 'STARTING')) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/agency/subaccounts/${sub.id}/waha/status`);
        setWahaData(res.data);

        if (res.data.status === 'WORKING') {
          setQrImage(null);
          clearInterval(interval);
        } else {
          fetchQr();
        }
      } catch {
        /* silencioso */
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [wahaData?.status, sub.id]);

  const handleStartSession = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post(`/agency/subaccounts/${sub.id}/waha/start`);
      setWahaData(res.data);
      setTimeout(() => fetchQr(), 1500);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Error al iniciar la sesión en WhatsApp');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.post(`/agency/subaccounts/${sub.id}/waha/logout`);
      setConfirmLogout(false);
      await fetchStatus();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Error al desconectar la sesión');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">WhatsApp Gateway (WAHA)</h3>
              <p className="text-xs text-gray-500">Subcuenta: <span className="font-semibold text-gray-700">{sub.name}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Metadata Session Bar */}
          <div className="flex items-center justify-between text-xs px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-1.5 text-gray-600 font-mono">
              <span className="text-gray-400">Sesión:</span>
              <strong className="text-gray-800">{wahaData?.session || sub.wahaSession || 'Generando...'}</strong>
            </div>
            {wahaData?.isProtected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Lock className="w-3 h-3 text-emerald-700" /> Producción Protegida
              </span>
            ) : (
              <span className="text-gray-400 text-[11px]">Instancia aislada</span>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
              <p className="text-sm text-gray-600">Consultando estado en WAHA...</p>
            </div>
          ) : wahaData?.status === 'WORKING' ? (
            /* Estado: CONECTADO Y TRABAJANDO */
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="text-base font-bold text-emerald-950">WhatsApp Conectado y Operativo</h4>
                <p className="text-xs text-emerald-700">
                  Esta línea está activa y atendiendo mensajes de clientes mediante IA.
                </p>
                {wahaData.phone && (
                  <div className="inline-block mt-1 px-3 py-1 bg-white/80 border border-emerald-300 rounded-lg text-xs font-mono font-semibold text-emerald-900">
                    +{wahaData.phone} {wahaData.pushName ? `(${wahaData.pushName})` : ''}
                  </div>
                )}
              </div>

              {wahaData.isProtected ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-950">Protección Activa de Producción</p>
                    <p className="text-amber-800 mt-0.5">
                      Esta sesión (<code className="font-mono text-[11px]">ferreos</code>) pertenece a Kits Docentes Venezuela. Está blindada para evitar desconexiones accidentales.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  {!confirmLogout ? (
                    <button
                      onClick={() => setConfirmLogout(true)}
                      className="w-full py-2 px-3 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Desconectar número de WhatsApp
                    </button>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                      <p className="text-xs text-red-800 font-medium">¿Seguro que deseas cerrar sesión en este número?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmLogout(false)}
                          className="flex-1 py-1.5 px-3 bg-white border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleLogout}
                          disabled={actionLoading}
                          className="flex-1 py-1.5 px-3 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 flex items-center justify-center gap-1"
                        >
                          {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : wahaData?.status === 'SCAN_QR_CODE' || wahaData?.status === 'STARTING' ? (
            /* Estado: ESCANEAR QR */
            <div className="space-y-4 text-center">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-900">Escanea este código QR</h4>
                <p className="text-xs text-gray-500">
                  WhatsApp &gt; Dispositivos vinculados &gt; Vincular dispositivo
                </p>
              </div>

              <div className="flex justify-center p-3 bg-gray-50 rounded-2xl border border-gray-200">
                {qrImage ? (
                  <div className="space-y-2">
                    <img
                      src={qrImage}
                      alt="Código QR WhatsApp"
                      className="w-56 h-56 mx-auto rounded-xl border border-gray-300 bg-white p-2 shadow-xs"
                    />
                    <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Esperando escaneo con tu teléfono...
                    </div>
                  </div>
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-dashed border-gray-300">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-xs text-gray-500">Generando QR seguro...</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Estado: SIN CONFIGURAR / STOPPED */
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center mx-auto">
                <QrCode className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-900">WhatsApp no conectado</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Inicia la sesión independiente para que esta subcuenta pueda conectar su propia línea de WhatsApp mediante código QR.
                </p>
              </div>
              <button
                onClick={handleStartSession}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-xs transition disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Iniciando sesión en WAHA...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    Iniciar Sesión y Generar QR
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            onClick={fetchStatus}
            disabled={loading || actionLoading}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
