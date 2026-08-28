import React from 'react';
import { CheckCircle2, Clock, Calendar } from 'lucide-react';
import { Task } from './types';

interface LeadTasksListProps {
  tasks: Task[];
}

export default function LeadTasksList({ tasks }: LeadTasksListProps) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-sm">No hay tareas asociadas a este Lead</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {tasks.map((task) => {
        const isPending = task.status === 'PENDING';
        return (
          <div
            key={task.id}
            className={`p-3 rounded-lg border transition-all ${
              isPending
                ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300'
                : 'bg-gray-50 border-gray-200 opacity-80'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                {isPending ? (
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <h4
                    className={`text-sm font-semibold ${
                      isPending ? 'text-gray-900' : 'text-gray-500 line-through'
                    }`}
                  >
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                  isPending
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {task.status}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-2.5 text-[11px] text-gray-500">
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Vence: {new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              {task.createdAt && (
                <div className="flex items-center gap-1">
                  <span>Creado: {new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
