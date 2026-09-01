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

  // ── Cargar agencias ──────────────────────────────────────

  useEffect(() => {
    fetchAgencies();
  }, []);

  async function fetchAgencies() {
    setLoading(true);
    try {
      const { data } = await api.get('/agency');
      setAgencies(Array.isArray(data) ? data : []);
    } catch {
      setAgencies([]);
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

  // ── Render ────────────────────────────────────────────────

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
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
                Subcuentas ({subaccounts.length})
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
                <div className="space-y-2">
                  {subaccounts.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">{sub.name}</span>
                          <StatusBadge status={sub.status} />
                          <PlanBadge plan={sub.plan} />
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {sub._count?.contacts ?? 0} contactos ·{' '}
                          Creada {new Date(sub.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Acciones rápidas */}
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        {sub.status !== 'active' && (
                          <button
                            onClick={() => handleStatusChange(sub.id, 'active')}
                            className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                          >
                            Activar
                          </button>
                        )}
                        {sub.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(sub.id, 'paused')}
                            className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                          >
                            Pausar
                          </button>
                        )}
                        <Link
                          href={`/dashboard?tenantId=${sub.id}`}
                          className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          <BarChart2 className="w-3 h-3" /> Ver CRM
                        </Link>
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
    </PageContainer>
  );
}
