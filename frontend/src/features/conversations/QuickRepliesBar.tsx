'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Plus, Settings, Sparkles } from 'lucide-react';
import QuickRepliesModal, { QuickReply, DEFAULT_QUICK_REPLIES } from './QuickRepliesModal';

interface QuickRepliesBarProps {
  tenantId?: string;
  onSelectReply: (content: string) => void;
}

export default function QuickRepliesBar({ tenantId, onSelectReply }: QuickRepliesBarProps) {
  const [replies, setReplies] = useState<QuickReply[]>(DEFAULT_QUICK_REPLIES);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const storageKey = `crm_quick_replies_${tenantId || 'default'}`;

  // Load from localStorage or initialize with defaults
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setReplies(parsed);
            return;
          }
        }
        // If not present, save and set defaults
        localStorage.setItem(storageKey, JSON.stringify(DEFAULT_QUICK_REPLIES));
        setReplies(DEFAULT_QUICK_REPLIES);
      } catch {
        setReplies(DEFAULT_QUICK_REPLIES);
      }
    }
  }, [storageKey]);

  const handleSaveReplies = (newReplies: QuickReply[]) => {
    setReplies(newReplies);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newReplies));
      } catch {}
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/90 border-t border-gray-200 overflow-x-auto no-scrollbar select-none">
        {/* Manage button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 bg-amber-100/80 hover:bg-amber-200 text-amber-900 border border-amber-300/80 rounded-lg text-[11px] font-bold shrink-0 transition shadow-2xs group"
          title="Administrar o crear respuestas rápidas"
        >
          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500 group-hover:scale-110 transition" />
          <span>Respuestas Rápidas</span>
        </button>

        {/* Quick Reply Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {replies.map((qr) => (
            <button
              key={qr.id}
              type="button"
              onClick={() => onSelectReply(qr.content)}
              className="px-2.5 py-1 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-200 hover:border-blue-300 rounded-lg text-[11px] font-medium shrink-0 transition flex items-center gap-1 shadow-2xs active:scale-95"
              title={`Clic para insertar: "${qr.content.substring(0, 80)}..."`}
            >
              <span className="truncate max-w-[140px] sm:max-w-[180px]">{qr.title}</span>
            </button>
          ))}
        </div>

        {/* Add new quick button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md shrink-0 transition ml-auto"
          title="Configurar respuestas rápidas"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal */}
      <QuickRepliesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        replies={replies}
        onSaveReplies={handleSaveReplies}
      />
    </>
  );
}
