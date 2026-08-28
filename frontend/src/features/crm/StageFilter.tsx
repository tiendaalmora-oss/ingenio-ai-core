import React from 'react';
import { KANBAN_STAGES } from './types';

interface StageFilterProps {
  selectedStage: string;
  onSelectStage: (stage: string) => void;
  counts?: Record<string, number>;
  totalCount?: number;
}

export default function StageFilter({
  selectedStage,
  onSelectStage,
  counts = {},
  totalCount = 0,
}: StageFilterProps) {
  const options = [
    { key: '', label: 'Todos los Leads', count: totalCount },
    ...KANBAN_STAGES.map((stage) => ({
      key: stage,
      label: stage,
      count: counts[stage] ?? 0,
    })),
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
      {options.map((opt) => {
        const isSelected = selectedStage === opt.key;
        return (
          <button
            key={opt.key || 'all'}
            onClick={() => onSelectStage(opt.key)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex-shrink-0 ${
              isSelected
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            <span>{opt.label}</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${
                isSelected ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
