'use client';

import React from 'react';
import { LeadListItem, KanbanStage } from './types';
import LeadScoreBadge from './LeadScoreBadge';
import { Phone, MessageSquare, Flame, CheckCircle2, ChevronRight, Tag, User } from 'lucide-react';
import Link from 'next/link';

interface KanbanBoardProps {
  kanban: Record<string, LeadListItem[]>;
  onSelectLead: (id: string) => void;
  onMoveStage: (id: string, newStage: KanbanStage) => void;
}

const COLUMNS: Array<{ key: string; title: string; icon: string; color: string; badgeBg: string }> = [
  { key: 'Nuevo', title: 'Contacto Inicial (Cold)', icon: '❄️', color: 'border-slate-300 bg-slate-50/50', badgeBg: 'bg-slate-200 text-slate-800' },
  { key: 'Interesado', title: 'Interesados (Warm)', icon: '🌤️', color: 'border-blue-300 bg-blue-50/30', badgeBg: 'bg-blue-200 text-blue-800' },
  { key: 'Oferta', title: 'Listos para Pagar (Hot)', icon: '🔥', color: 'border-amber-300 bg-amber-50/30', badgeBg: 'bg-amber-200 text-amber-800' },
  { key: 'Venta', title: 'Ventas Cerradas (Closed)', icon: '💰', color: 'border-green-300 bg-green-50/30', badgeBg: 'bg-green-200 text-green-800' },
];

export default function KanbanBoard({ kanban, onSelectLead, onMoveStage }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      {COLUMNS.map((col) => {
        // Collect leads for column matching key or related stages
        let columnLeads: LeadListItem[] = [];
        if (col.key === 'Nuevo') {
          columnLeads = [...(kanban['Nuevo'] || []), ...(kanban['Contactado'] || [])];
        } else if (col.key === 'Interesado') {
          columnLeads = [...(kanban['Interesado'] || []), ...(kanban['Demo'] || [])];
        } else if (col.key === 'Oferta') {
          columnLeads = [...(kanban['Oferta'] || [])];
        } else if (col.key === 'Venta') {
          columnLeads = [...(kanban['Venta'] || []), ...(kanban['Cliente'] || [])];
        }

        return (
          <div key={col.key} className={`rounded-xl border ${col.color} p-3 flex flex-col min-h-[500px]`}>
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 mb-3">
              <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800">
                <span>{col.icon}</span>
                <span>{col.title}</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                {columnLeads.length}
              </span>
            </div>

            {/* Cards List */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[75vh] pr-1">
              {columnLeads.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 font-medium">
                  Sin prospectos en esta etapa
                </div>
              ) : (
                columnLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead.id)}
                    className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer space-y-2.5 group"
                  >
                    {/* Top Row: Name & Score */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-gray-900 group-hover:text-blue-600 transition">
                          {lead.name}
                        </h4>
                        {lead.phone && (
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </p>
                        )}
                      </div>
                      <LeadScoreBadge score={lead.score} />
                    </div>

                    {/* Interests / Product Tag */}
                    {lead.interests && lead.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {lead.interests.map((prod) => (
                          <span
                            key={prod}
                            className="inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 truncate max-w-full"
                          >
                            📦 {prod}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {lead.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100"
                          >
                            {t}
                          </span>
                        ))}
                        {lead.tags.length > 2 && (
                          <span className="text-[9px] text-gray-400 px-1">
                            +{lead.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Last Message Preview */}
                    {lead.lastMessageContent && (
                      <p className="text-[11px] text-gray-500 line-clamp-2 italic bg-gray-50/80 p-1.5 rounded-lg border border-gray-100">
                        "{lead.lastMessageContent}"
                      </p>
                    )}

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                      <Link
                        href="/conversations"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Chat
                      </Link>

                      <select
                        value={col.key}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onMoveStage(lead.id, e.target.value as KanbanStage)}
                        className="text-[10px] font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 outline-none hover:bg-gray-200 transition"
                      >
                        <option value="Nuevo">Mover a: ❄️ Cold</option>
                        <option value="Interesado">Mover a: 🌤️ Warm</option>
                        <option value="Oferta">Mover a: 🔥 Hot</option>
                        <option value="Venta">Mover a: 💰 Closed</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
