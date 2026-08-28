import React from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ 
  title = "No hay registros", 
  description = "Aún no se ha agregado ningún elemento a esta sección.",
  icon = <PackageOpen className="w-12 h-12 text-gray-300" />
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 h-64 bg-gray-50 border-2 border-gray-200 border-dashed rounded-xl m-4">
      <div className="mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-sm">{description}</p>
    </div>
  );
}
