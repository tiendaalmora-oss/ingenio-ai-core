import React from 'react';
import { Plus } from 'lucide-react';
import SearchBox from '@/components/ui/SearchBox';

interface CollectionToolbarProps {
  onAdd: () => void;
  search: string;
  onSearchChange: (val: string) => void;
  editable: boolean;
}

export default function CollectionToolbar({ onAdd, search, onSearchChange, editable }: CollectionToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-4 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <SearchBox 
        value={search} 
        onChange={onSearchChange} 
        placeholder="Buscar en esta colección..." 
      />
      
      {editable && (
        <button 
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Crear Nuevo
        </button>
      )}
    </div>
  );
}
