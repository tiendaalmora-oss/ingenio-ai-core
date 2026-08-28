import React from 'react';
import EmptyState from '@/components/ui/EmptyState';
import { Database } from 'lucide-react';

export default function EmptyCollectionState() {
  return (
    <EmptyState 
      title="Sección vacía" 
      description="No hay registros en esta sección. Puedes comenzar agregando un nuevo elemento."
      icon={<Database className="w-12 h-12 text-gray-300" />}
    />
  );
}
