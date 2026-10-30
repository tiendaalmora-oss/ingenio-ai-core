'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Smartphone, Check, Loader2, Sparkles } from 'lucide-react';
import {
  isPushSupported,
  getExistingSubscription,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  triggerTestPush,
} from '../services/push-notification.service';
import { useAuthStore } from '../store/auth.store';

export default function PushNotificationButton() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { tenantId, role } = useAuthStore();

  useEffect(() => {
    if (isPushSupported()) {
      setSupported(true);
      getExistingSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    }
  }, []);

  if (!supported) return null;

  const handleToggle = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (subscribed) {
        await unsubscribeFromWebPush();
        setSubscribed(false);
      } else {
        const res = await subscribeToWebPush(tenantId, role);
        if (res.success) {
          setSubscribed(true);
          // Disparar prueba de bienvenida inmediata
          setTimeout(() => {
            triggerTestPush();
          }, 600);
        } else {
          setErrorMsg(res.error || 'No se pudo activar las notificaciones');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al configurar');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setTestSent(true);
    await triggerTestPush();
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/40 border-b border-blue-100 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              subscribed
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-blue-600 text-white shadow-xs'
            }`}
          >
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 dark:text-slate-100 leading-tight">
              {subscribed ? 'Alertas Push Activas en este Celular' : 'Alertas de Venta en la Barra'}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
              {subscribed
                ? role === 'agency_admin'
                  ? 'Recibiendo de todas las subcuentas 👑'
                  : 'Sonando sólo para esta cuenta 🔒'
                : 'Vibración y sonido directo a tu teléfono'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {subscribed && (
            <button
              onClick={handleTest}
              disabled={testSent}
              className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] rounded border border-emerald-300 dark:border-emerald-700 transition flex items-center gap-1 shadow-2xs"
              title="Probar sonido y notificación en la barra"
            >
              {testSent ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" /> Enviada
                </>
              ) : (
                <>
                  <BellRing className="w-3 h-3" /> Probar
                </>
              )}
            </button>
          )}

          <button
            onClick={handleToggle}
            disabled={loading}
            className={`px-2.5 py-1 text-[11px] font-bold rounded transition flex items-center gap-1 shadow-2xs ${
              subscribed
                ? 'bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-300 border border-gray-200 dark:border-slate-700'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none'
            }`}
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : subscribed ? (
              'Pausar'
            ) : (
              <>
                <Bell className="w-3 h-3" /> Activar
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <p className="text-[10px] text-red-600 dark:text-red-400 mt-1.5 font-medium leading-tight">
          ⚠️ {errorMsg}
        </p>
      )}
    </div>
  );
}
