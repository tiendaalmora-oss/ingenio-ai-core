import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConflictDialogProps {
  isOpen: boolean;
  onReload: () => void;
  onClose: () => void;
}

export default function ConflictDialog({ isOpen, onReload, onClose }: ConflictDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-lg font-bold">Conflicto de Versión</h3>
        </div>
        <p className="text-gray-700 text-sm mb-6">
          La configuración fue modificada por otro usuario. Recargue la información antes de continuar. (Tus cambios actuales no se perderán pero deberás resolver el conflicto).
        </p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-medium text-sm rounded hover:bg-gray-100"
          >
            Cerrar
          </button>
          <button 
            onClick={onReload}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
          >
            Recargar
          </button>
        </div>
      </div>
    </div>
  );
}
