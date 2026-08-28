import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteDialogProps {
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteDialog({ isOpen, isDeleting, onConfirm, onCancel }: DeleteDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <AlertTriangle className="w-6 h-6" />
          <h3 className="text-lg font-bold">Eliminar registro</h3>
        </div>
        <p className="text-gray-700 text-sm mb-6">
          ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-600 font-medium text-sm rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white font-medium text-sm rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
