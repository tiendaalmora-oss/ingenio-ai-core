import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

interface CollectionRowProps {
  item: any;
  columns: string[];
  editable: boolean;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export default function CollectionRow({ item, columns, editable, onEdit, onDelete }: CollectionRowProps) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {columns.map(col => (
        <td key={col} className="px-6 py-4 text-sm text-gray-700 max-w-sm truncate">
          {String(item[col] || '')}
        </td>
      ))}
      {editable && (
        <td className="px-6 py-4 text-sm text-right space-x-2">
          <button 
            onClick={() => onEdit(item)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors inline-flex"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(item)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors inline-flex"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      )}
    </tr>
  );
}
