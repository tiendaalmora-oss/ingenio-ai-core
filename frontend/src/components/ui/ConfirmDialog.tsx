import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  type = 'warning',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const typeConfig = {
    danger: { icon: AlertTriangle, color: 'text-red-600', bgBtn: 'bg-red-600 hover:bg-red-700', bgIcon: 'bg-red-100' },
    warning: { icon: AlertCircle, color: 'text-orange-600', bgBtn: 'bg-orange-600 hover:bg-orange-700', bgIcon: 'bg-orange-100' },
    info: { icon: Info, color: 'text-blue-600', bgBtn: 'bg-blue-600 hover:bg-blue-700', bgIcon: 'bg-blue-100' }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center mb-6">
          <div className={`p-3 rounded-full ${config.bgIcon} mb-4`}>
            <Icon className={`w-8 h-8 ${config.color}`} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm">{description}</p>
        </div>
        <div className="flex justify-end gap-3 w-full">
          <button 
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-100 border border-gray-200 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-white font-medium text-sm rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${config.bgBtn}`}
          >
            {isLoading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
