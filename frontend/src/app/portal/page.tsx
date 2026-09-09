'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import api from '@/services/api';
import { Loader2, AlertCircle, ShieldCheck, ArrowRight, Building2 } from 'lucide-react';
import Link from 'next/link';

function PortalHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setCredentials } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  const key = searchParams.get('key');

  useEffect(() => {
    if (!key) {
      setError('No se proporcionó ninguna clave de acceso en el enlace.');
      setLoading(false);
      return;
    }

    const authenticate = async () => {
      try {
        const res = await api.get(`/auth/magic/${encodeURIComponent(key)}`);
        const data = res.data;

        setTenantInfo(data);

        // Guardar credenciales de cliente
        setCredentials(data.tenantId, data.token, 'client', data.tenantName, data.name);

        // Pequeño delay de bienvenida antes de redirigir
        setTimeout(() => {
          router.replace('/conversations');
        }, 1200);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            'El enlace de acceso ha expirado o no es válido. Contacta a tu administrador para recibir un nuevo enlace.',
        );
      } finally {
        setLoading(false);
      }
    };

    authenticate();
  }, [key, router, setCredentials]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100 text-center">
        {loading ? (
          <div className="py-8 space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Validando acceso seguro...</h2>
            <p className="text-sm text-slate-500">Conectando con tu espacio de trabajo independiente.</p>
          </div>
        ) : error ? (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Enlace no válido</h2>
            <p className="text-sm text-slate-600 bg-red-50/50 p-3 rounded-xl border border-red-100">
              {error}
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
              >
                Ir a la pantalla de inicio
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-600">Acceso Concedido</span>
              <h2 className="text-xl font-bold text-slate-900">{tenantInfo?.tenantName || 'Bienvenido'}</h2>
              <p className="text-xs text-slate-500">Ingresando a tus conversaciones y CRM...</p>
            </div>
            <div className="pt-2 flex justify-center">
              <div className="flex items-center gap-2 text-xs font-medium text-blue-600 animate-pulse">
                <span>Cargando tu asistente...</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      }
    >
      <PortalHandler />
    </Suspense>
  );
}
