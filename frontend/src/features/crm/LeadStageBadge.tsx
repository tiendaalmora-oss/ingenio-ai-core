import React from 'react';
import { KanbanStage, KANBAN_STAGES } from './types';

interface LeadStageBadgeProps {
  stage: string;
  onChangeStage?: (newStage: KanbanStage) => void;
  interactive?: boolean;
}

const stageStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Nuevo: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  Contactado: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  Interesado: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  Demo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  Oferta: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  Venta: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  Cliente: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-600' },
};

export default function LeadStageBadge({ stage, onChangeStage, interactive = false }: LeadStageBadgeProps) {
  const current = stageStyles[stage] || {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  };

  if (interactive && onChangeStage) {
    return (
      <select
        value={stage}
        onChange={(e) => onChangeStage(e.target.value as KanbanStage)}
        onClick={(e) => e.stopPropagation()}
        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${current.bg} ${current.text} ${current.border} cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all`}
      >
        {KANBAN_STAGES.map((s) => (
          <option key={s} value={s} className="bg-white text-gray-900 font-normal">
            {s}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${current.bg} ${current.text} ${current.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      {stage || 'Nuevo'}
    </span>
  );
}
