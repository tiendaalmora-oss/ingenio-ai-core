'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Check, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';

interface Subaccount {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'suspended';
  plan: string;
}

interface Agency {
  id: string;
  name: string;
  subaccounts: Subaccount[];
}

export default function SubaccountSwitcher() {
  const [open, setOpen] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [unassigned, setUnassigned] = useState<Subaccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string>('');
  const ref = useRef<HTMLDivElement>(null);

  // Leer el tenant activo del localStorage al montar
  useEffect(() => {
    const stored = localStorage.getItem('tenant_id');
    if (stored) setActiveTenantId(stored);
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar agencias y subcuentas al abrir
  async function loadAgencies() {
    setLoading(true);
    try {
      const { data } = await api.get<{ agencies: Agency[]; unassignedTenants: Subaccount[] }>('/agency/overview');
      const loadedAgencies = data?.agencies || [];
      const loadedUnassigned = data?.unassignedTenants || [];

      setAgencies(loadedAgencies);
      setUnassigned(loadedUnassigned);

      // Resolver el nombre del tenant activo
      const stored = localStorage.getItem('tenant_id');
      if (stored) {
        // 1. Buscar en unassigned (Cuenta Principal)
        const unassignedMatch = loadedUnassigned.find((u) => u.id === stored);
        if (unassignedMatch) {
          setActiveName(unassignedMatch.name || 'Cuenta Principal');
        } else {
          // 2. Buscar en agencias
          for (const ag of loadedAgencies) {
            const found = ag.subaccounts?.find((s) => s.id === stored);
            if (found) {
              setActiveName(found.name);
              break;
            }
          }
        }
      }
    } catch {
      // Fallback a /agency
      try {
        const { data } = await api.get<Agency[]>('/agency');
        setAgencies(Array.isArray(data) ? data : []);
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  function handleSwitch(sub: { id: string; name?: string }) {
    localStorage.setItem('tenant_id', sub.id);
    setActiveTenantId(sub.id);
    if (sub.name) setActiveName(sub.name);
    setOpen(false);
    // Recargar la página para que el bootstrap se actualice con el nuevo tenant
    window.location.reload();
  }

  const totalSubs =
    unassigned.length + agencies.reduce((acc, ag) => acc + (ag.subaccounts?.length || 0), 0);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          loadAgencies();
        }}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium text-gray-700 transition-colors max-w-[200px]"
        title="Cambiar subcuenta"
      >
        <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span className="truncate hidden sm:inline">
          {activeName || 'Subcuentas'}
        </span>
        {totalSubs > 0 && (
          <span className="hidden sm:inline text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 font-semibold">
            {totalSubs}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cambiar Subcuenta
            </span>
            <Link
              href="/agency"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Gestionar
            </Link>
          </div>

          {/* Contenido */}
          <div className="max-h-72 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : unassigned.length === 0 && agencies.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-400">No hay cuentas disponibles.</p>
                <Link
                  href="/agency"
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                >
                  Crear primera agencia →
                </Link>
              </div>
            ) : (
              <>
                {/* Cuentas Principales (Original operativa) */}
                {unassigned.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 text-xs font-bold text-blue-600 uppercase tracking-wide bg-blue-50/60 flex items-center justify-between">
                      <span>Cuenta Principal (Operativa)</span>
                    </div>
                    {unassigned.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleSwitch(sub)}
                        className={`w-full text-left flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors ${
                          activeTenantId === sub.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {sub.name || 'CRM Principal'}
                          </p>
                          <p className="text-xs text-gray-500">Cuenta Original con todos tus datos</p>
                        </div>
                        {activeTenantId === sub.id && (
                          <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Agencias y sus Subcuentas */}
                {agencies.map((ag) => (
                  <div key={ag.id} className="border-t border-gray-100">
                    <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                      {ag.name}
                    </div>

                    {!ag.subaccounts || ag.subaccounts.length === 0 ? (
                      <div className="px-4 py-2 text-xs text-gray-400 italic">Sin subcuentas</div>
                    ) : (
                      ag.subaccounts
                        .filter((s) => s.status !== 'suspended')
                        .map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => handleSwitch(sub)}
                            className={`w-full text-left flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors ${
                              activeTenantId === sub.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{sub.name}</p>
                              <p className="text-xs text-gray-400 capitalize">
                                {sub.plan} · {sub.status}
                              </p>
                            </div>
                            {activeTenantId === sub.id && (
                              <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                            )}
                          </button>
                        ))
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

