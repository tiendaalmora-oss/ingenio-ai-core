'use client';

import React, { useState } from 'react';
import { Zap, Plus, Trash2, Edit2, Check, X, Sparkles } from 'lucide-react';

export interface QuickReply {
  id: string;
  title: string;
  shortcut: string;
  content: string;
  category?: string;
}

export const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  {
    id: 'qr-pago-bs',
    title: '💳 Datos Pago Móvil',
    shortcut: '/pago',
    category: 'Pagos',
    content: '¡Excelente! Acá tienes los datos para realizar tu pago por Pago Móvil:\n🏦 Banco: Banesco (0134)\n📱 Teléfono: 0412-1234567\n🪪 Cédula: V-12.345.678\n\nUna vez realizada la transferencia, envíanos el capture o comprobante por acá para darte acceso de inmediato.'
  },
  {
    id: 'qr-pago-usdt',
    title: '🌐 Binance / Zinli / PayPal',
    shortcut: '/dolar',
    category: 'Pagos',
    content: 'Para pagos en divisas aceptamos:\n🟡 Binance Pay ID: 123456789\n🔵 Zinli / PayPal: pagos@ingeniodigital.shop\n\nPor favor envíanos la captura del pago al completarlo.'
  },
  {
    id: 'qr-entrega',
    title: '📁 Entrega de Material (Drive)',
    shortcut: '/entrega',
    category: 'Entrega',
    content: '¡Pago verificado con éxito! 🎉\n\nAquí tienes el enlace de acceso inmediato en Google Drive con todo tu material pedagógico editable:\n👉 [Enlace de Descarga Drive]\n\nCualquier duda con la descarga o edición estamos a tu completa orden.'
  },
  {
    id: 'qr-saludo-humano',
    title: '👤 Saludo Asesor Humano',
    shortcut: '/asesor',
    category: 'Atención',
    content: '¡Hola! Con mucho gusto te atiendo. Mi nombre es [Nombre Asesor] del equipo de soporte humano. ¿En qué te puedo ayudar o qué duda tienes con el material?'
  },
  {
    id: 'qr-combo',
    title: '🎁 Oferta Especial Combo',
    shortcut: '/combo',
    category: 'Ventas',
    content: '¡Tenemos una promoción especial hoy! Si llevas el combo de 2 o más materias, te quedan a precio preferencial con todos los bonos y actualizaciones incluidas. ¿Te gustaría que te prepare el acceso?'
  }
];

interface QuickRepliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  replies: QuickReply[];
  onSaveReplies: (newReplies: QuickReply[]) => void;
}

export default function QuickRepliesModal({
  isOpen,
  onClose,
  replies,
  onSaveReplies,
}: QuickRepliesModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingId('new');
    setTitle('');
    setShortcut('/');
    setContent('');
    setCategory('General');
  };

  const handleStartEdit = (qr: QuickReply) => {
    setEditingId(qr.id);
    setTitle(qr.title);
    setShortcut(qr.shortcut || '/');
    setContent(qr.content);
    setCategory(qr.category || 'General');
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (editingId === 'new') {
      const newItem: QuickReply = {
        id: `qr-${Date.now()}`,
        title: title.trim(),
        shortcut: shortcut.trim() || `/${title.trim().toLowerCase().slice(0, 6)}`,
        content: content.trim(),
        category: category.trim() || 'General',
      };
      onSaveReplies([...replies, newItem]);
    } else {
      const updated = replies.map((r) =>
        r.id === editingId
          ? {
              ...r,
              title: title.trim(),
              shortcut: shortcut.trim(),
              content: content.trim(),
              category: category.trim(),
            }
          : r
      );
      onSaveReplies(updated);
    }
    setEditingId(null);
  };

  const handleDeleteItem = (id: string) => {
    onSaveReplies(replies.filter((r) => r.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleRestoreDefaults = () => {
    onSaveReplies(DEFAULT_QUICK_REPLIES);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold">Gestionar Respuestas Rápidas</h3>
              <p className="text-[11px] text-gray-400">
                Plantillas de 1 clic para enviar datos bancarios, enlaces de Drive y guiones.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Top Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleStartCreate}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Nueva Respuesta Rápida
            </button>

            <button
              onClick={handleRestoreDefaults}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 underline"
            >
              Restaurar predeterminadas
            </button>
          </div>

          {/* Form when creating/editing */}
          {editingId && (
            <form
              onSubmit={handleSaveItem}
              className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-900">
                  {editingId === 'new' ? '✨ Crear Nueva Respuesta' : '✏️ Editar Respuesta'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Título / Botón (ej: 💳 Datos Pago Móvil)
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: 💳 Datos Pago Móvil"
                    className="w-full p-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Atajo / Comando (ej: /pago)
                  </label>
                  <input
                    type="text"
                    value={shortcut}
                    onChange={(e) => setShortcut(e.target.value)}
                    placeholder="Ej: /pago"
                    className="w-full p-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Contenido del Mensaje
                </label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribe el texto exacto que se insertará o enviará..."
                  className="w-full p-2.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Guardar Respuesta
                </button>
              </div>
            </form>
          )}

          {/* List of Replies */}
          <div className="space-y-2">
            {replies.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">
                No tienes respuestas rápidas configuradas.
              </p>
            ) : (
              replies.map((qr) => (
                <div
                  key={qr.id}
                  className="p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition flex items-start justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs text-gray-900">{qr.title}</span>
                      {qr.shortcut && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono text-[10px]">
                          {qr.shortcut}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap bg-gray-50/60 p-2 rounded-lg border border-gray-100 font-normal">
                      {qr.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pt-1">
                    <button
                      onClick={() => handleStartEdit(qr)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(qr.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
