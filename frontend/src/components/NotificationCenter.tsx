'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, UserCheck, DollarSign, Flame, ArrowRight, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Poll alerts every 5 seconds for real-time notifications
  const { data } = useQuery({
    queryKey: ['operator-alerts'],
    queryFn: async () => {
      const res = await api.get('/crm/alerts');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const alerts = data?.alerts || [];
  const urgentCount = data?.urgentCount || 0;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAlertClick = (alert: any) => {
    setIsOpen(false);
    if (alert.conversationId) {
      router.push(`/conversations?id=${alert.conversationId}`);
    } else {
      router.push(`/crm`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          urgentCount > 0
            ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title={urgentCount > 0 ? `${urgentCount} alertas urgentes de operador` : 'Notificaciones del CRM'}
      >
        <Bell className="w-5 h-5" />
        
        {urgentCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-white text-[10px] font-bold items-center justify-center shadow-xs">
              {urgentCount > 9 ? '9+' : urgentCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Alertas de Asesor y Pagos
              </h4>
            </div>
            {urgentCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500/80 text-white text-[10px] font-bold rounded-full">
                {urgentCount} urgentes
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-1">
                <p className="font-semibold text-gray-600">¡Todo al día!</p>
                <p>No hay alertas de pagos ni solicitudes de asesor pendientes.</p>
              </div>
            ) : (
              alerts.map((al: any) => {
                const isPayment = al.type === 'PAYMENT';
                const isHandoff = al.type === 'HANDOFF';

                return (
                  <div
                    key={al.id}
                    onClick={() => handleAlertClick(al)}
                    className={`p-3.5 text-left transition hover:bg-gray-50 cursor-pointer flex gap-3 ${
                      isPayment ? 'bg-emerald-50/40 hover:bg-emerald-50/70' :
                      isHandoff ? 'bg-amber-50/40 hover:bg-amber-50/70' :
                      'bg-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                      isPayment ? 'bg-emerald-600 shadow-emerald-200 shadow-sm' :
                      isHandoff ? 'bg-amber-600 shadow-amber-200 shadow-sm' :
                      'bg-orange-500 shadow-orange-200 shadow-sm'
                    }`}>
                      {isPayment ? <DollarSign className="w-4 h-4" /> :
                       isHandoff ? <UserCheck className="w-4 h-4" /> :
                       <Flame className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {al.title}
                        </p>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {al.timestamp ? new Date(al.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-1">
                        {al.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-blue-600 font-medium">
                        <span className="truncate text-gray-500 font-normal">
                          {al.contactName} • {al.contactPhone}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold shrink-0 ml-1">
                          Ver chat <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
            <Link
              href="/conversations"
              onClick={() => setIsOpen(false)}
              className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
            >
              Ir al Live Chat Hub
            </Link>
            <Link
              href="/crm"
              onClick={() => setIsOpen(false)}
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
            >
              Ver Pipeline CRM
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
