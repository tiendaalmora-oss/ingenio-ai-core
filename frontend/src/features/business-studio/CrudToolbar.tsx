import React from 'react';
import { Plus, Search } from 'lucide-react';

interface CrudToolbarProps {
  onAdd: () => void;
  search: string;
  onSearchChange: (val: string) => void;
  editable: boolean;
}

export default function CrudToolbar({ onAdd, search, onSearchChange, editable }: CrudToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-4 gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar registros..." 
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      {editable && (
        <button 
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Crear Nuevo
        </button>
      )}
    </div>
  );
}
