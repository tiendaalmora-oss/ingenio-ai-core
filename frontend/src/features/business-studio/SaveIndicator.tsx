import React from 'react';
import { Check, Loader2 } from 'lucide-react';

interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  isDirty: boolean;
}

export default function SaveIndicator({ status, isDirty }: SaveIndicatorProps) {
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-md">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Guardando...</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-md">
        <Check className="w-4 h-4" />
        <span>Guardado</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-md">
        <span>Error al guardar</span>
      </div>
    );
  }

  if (isDirty) {
    return (
      <div className="flex items-center gap-2 text-sm text-orange-600 font-medium bg-orange-50 px-3 py-1.5 rounded-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-orange-400"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
        </span>
        <span>Cambios sin guardar</span>
      </div>
    );
  }

  return <div className="h-[32px]"></div>; // spacer
}
