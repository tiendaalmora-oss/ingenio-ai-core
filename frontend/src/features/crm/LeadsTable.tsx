import React from 'react';
import { Lead, KanbanStage } from './types';
import LeadStageBadge from './LeadStageBadge';
import LeadScoreBadge from './LeadScoreBadge';
import { Phone, Building, MessageSquare, CheckSquare, ChevronRight, Clock } from 'lucide-react';

interface LeadsTableProps {
  leads: Lead[];
  onSelectLead: (id: string) => void;
  onChangeStage: (id: string, newStage: KanbanStage) => void;
}

export default function LeadsTable({ leads, onSelectLead, onChangeStage }: LeadsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/75 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            <th className="py-3.5 px-4">Contacto / Lead</th>
            <th className="py-3.5 px-4">Empresa / Mensaje</th>
            <th className="py-3.5 px-4">Stage</th>
            <th className="py-3.5 px-4">AI Score</th>
            <th className="py-3.5 px-4 text-center">Tareas</th>
            <th className="py-3.5 px-4">Última Actividad</th>
            <th className="py-3.5 px-4 text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-sm">
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => onSelectLead(lead.id)}
              className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
            >
              {/* Contact / Lead */}
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                    {lead.name ? lead.name.charAt(0).toUpperCase() : 'L'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {lead.name || 'Sin nombre'}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{lead.phone || '—'}</span>
                    </div>
                  </div>
                </div>
              </td>

              {/* Company & Last message */}
              <td className="py-3.5 px-4 max-w-[200px]">
                {lead.company ? (
                  <div className="text-xs font-medium text-gray-800 flex items-center gap-1 mb-0.5 truncate">
                    <Building className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{lead.company}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic block mb-0.5">Sin empresa</span>
                )}
                {lead.lastMessageContent ? (
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{lead.lastMessageContent}</span>
                  </p>
                ) : (
                  <span className="text-xs text-gray-400">Sin mensajes</span>
                )}
              </td>

              {/* Stage dropdown */}
              <td className="py-3.5 px-4 whitespace-nowrap">
                <LeadStageBadge
                  stage={lead.kanbanStage}
                  interactive={true}
                  onChangeStage={(newStage) => onChangeStage(lead.id, newStage)}
                />
              </td>

              {/* AI Score */}
              <td className="py-3.5 px-4 whitespace-nowrap">
                <LeadScoreBadge score={lead.score || 0} />
              </td>

              {/* Tasks */}
              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                {lead.pendingTasks > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    <CheckSquare className="w-3 h-3" />
                    {lead.pendingTasks}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>

              {/* Last interaction */}
              <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-600">
                {lead.lastInteraction ? (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>{new Date(lead.lastInteraction).toLocaleDateString()}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">Nunca</span>
                )}
              </td>

              {/* Actions */}
              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLead(lead.id);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <span>Detalle</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
