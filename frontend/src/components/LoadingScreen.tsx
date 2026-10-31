'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950 z-50 text-center p-4">
      <img
        src="/logo-dark-cropped.png"
        alt="IngenioCRM"
        className="h-20 w-auto object-contain mb-6 animate-pulse"
      />
      <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
        <span>Iniciando IngenioCRM...</span>
      </div>
      <p className="text-slate-500 text-xs mt-2">Conectando con el servidor</p>
    </div>
  );
}
