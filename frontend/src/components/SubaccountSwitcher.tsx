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

  const PRIMARY_PROD_ID = 'dba1c54c-89c6-41e9-ae9d-03613377a5b3';
  const isPrimary = !activeTenantId || activeTenantId === PRIMARY_PROD_ID || unassigned.some(u => u.id === activeTenantId);

  const totalSubs =
    unassigned.length + agencies.reduce((acc, ag) => acc + (ag.subaccounts?.length || 0), 0);

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      {/* Botón rápido para volver a producción si se está dentro de una subcuenta */}
      {!isPrimary && (
        <button
          onClick={() => handleSwitch({ id: PRIMARY_PROD_ID, name: 'Default Tenant' })}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-colors shadow-xs"
          title="Volver a la cuenta principal de producción (Docentes)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Volver a Producción
        </button>
      )}

      <button
        onClick={() => {
          setOpen(!open);
          loadAgencies();
        }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all max-w-[240px] border shadow-xs ${
          isPrimary 
            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200' 
            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/20'
        }`}
        title="Cambiar subcuenta o volver a cuenta principal"
      >
        <Building2 className={`w-4 h-4 flex-shrink-0 ${isPrimary ? 'text-blue-600' : 'text-amber-600'}`} />
        <span className="truncate hidden sm:inline font-semibold">
          {isPrimary ? 'Producción (Docentes)' : activeName || 'Subcuenta'}
        </span>
        {!isPrimary && (
          <span className="hidden sm:inline-block text-[10px] bg-amber-200 text-amber-800 rounded px-1 font-bold">
            CLIENTE
          </span>
        )}
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
        <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Selector de Cuentas
              </span>
              <span className="text-[11px] text-gray-400 block">
                {isPrimary ? 'Actualmente en Producción' : `En subcuenta: ${activeName}`}
              </span>
            </div>
            <Link
              href="/agency"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Agencias
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
                    <div className="px-4 py-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wide bg-emerald-50/80 flex items-center justify-between border-b border-emerald-100">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Cuenta Principal de Producción
                      </span>
                    </div>
                    {unassigned.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleSwitch(sub)}
                        className={`w-full text-left flex items-center justify-between px-4 py-2.5 hover:bg-emerald-50/50 transition-colors ${
                          (activeTenantId === sub.id || (!activeTenantId && sub.id === PRIMARY_PROD_ID)) ? 'bg-emerald-50/60 font-semibold' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-gray-900 truncate">
                              {sub.name || 'Default Tenant'}
                            </p>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                              EN VIVO
                            </span>
                          </div>
                          <p className="text-xs text-emerald-700/80 font-medium">WhatsApp ferreos · Bot de Docentes</p>
                        </div>
                        {(activeTenantId === sub.id || (!activeTenantId && sub.id === PRIMARY_PROD_ID)) && (
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
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

