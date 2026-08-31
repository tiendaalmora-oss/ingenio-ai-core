'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Check, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://core.ai.ingeniodigital.shop';
const API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || '';

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
    if (agencies.length > 0) return; // ya cargadas
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/agency`, {
        headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      });
      const data: any[] = await res.json();

      // Para cada agencia, cargar sus subcuentas
      const withSubs = await Promise.all(
        data.map(async (ag) => {
          const subRes = await fetch(`${API_URL}/agency/${ag.id}/subaccounts`, {
            headers: { 'x-api-key': API_KEY },
          });
          const subs: Subaccount[] = await subRes.json();
          return { ...ag, subaccounts: subs };
        }),
      );
      setAgencies(withSubs);

      // Resolver el nombre del tenant activo
      const stored = localStorage.getItem('tenant_id');
      if (stored) {
        for (const ag of withSubs) {
          const found = ag.subaccounts.find((s) => s.id === stored);
          if (found) { setActiveName(found.name); break; }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSwitch(sub: Subaccount) {
    localStorage.setItem('tenant_id', sub.id);
    setActiveTenantId(sub.id);
    setActiveName(sub.name);
    setOpen(false);
    // Recargar la página para que el bootstrap se actualice con el nuevo tenant
    window.location.reload();
  }

  const totalSubs = agencies.reduce((acc, ag) => acc + ag.subaccounts.length, 0);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); loadAgencies(); }}
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
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
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
            ) : agencies.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-400">No hay agencias creadas.</p>
                <Link
                  href="/agency"
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                >
                  Crear primera agencia →
                </Link>
              </div>
            ) : (
              agencies.map((ag) => (
                <div key={ag.id}>
                  {/* Nombre de la agencia */}
                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                    {ag.name}
                  </div>

                  {/* Subcuentas de esa agencia */}
                  {ag.subaccounts.length === 0 ? (
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
                            <p className="text-xs text-gray-400 capitalize">{sub.plan} · {sub.status}</p>
                          </div>
                          {activeTenantId === sub.id && (
                            <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                          )}
                        </button>
                      ))
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
