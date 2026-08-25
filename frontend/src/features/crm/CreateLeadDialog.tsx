'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useToast } from '@/components/ui/ToastProvider';
import { X, UserPlus, Phone, User, Building, Tag, ShoppingBag } from 'lucide-react';

interface CreateLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLeadDialog({ isOpen, onClose }: CreateLeadDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [product, setProduct] = useState('Mega Kit de Matemática Secundaria Venezuela');
  const [stage, setStage] = useState('WARM');

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/crm/leads', {
        name,
        phone,
        company,
        interests: product ? [product] : [],
        leadStatus: stage,
        tags: ['MANUAL_CREATION'],
      });
      return res.data;
    },
    onSuccess: () => {
      addToast('Prospecto creado exitosamente', 'success');
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      setName('');
      setPhone('');
      setCompany('');
      onClose();
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Error al crear prospecto', 'error');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Crear Nuevo Prospecto</h3>
              <p className="text-[11px] text-gray-500">Registra un lead manualmente en el CRM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Completo *</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Prof. Roberto Castillo"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono / WhatsApp *</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 584121234567"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Colegio / Empresa (Opcional)</label>
            <div className="relative">
              <Building className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Ej: U.E. Simón Bolívar"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Producto de Interés</label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Mega Kit de Matemática Secundaria Venezuela">Kit Matemática</option>
                <option value="Mega Kit de Física Secundaria Venezuela">Kit Física</option>
                <option value="Combo Matemática + Física">Combo Matemática + Física</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Estado Inicial</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="COLD">❄️ Cold (Inicial)</option>
                <option value="WARM">🌤️ Warm (Interesado)</option>
                <option value="HOT">🔥 Hot (Pide Pago)</option>
                <option value="CLOSED">💰 Closed (Pagado)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || !phone.trim() || createMutation.isPending}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
          >
            {createMutation.isPending ? 'Guardando...' : 'Crear Prospecto'}
          </button>
        </div>
      </div>
    </div>
  );
}
