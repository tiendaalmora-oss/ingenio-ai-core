import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

interface CrudTableProps {
  data: any[];
  editable: boolean;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export default function CrudTable({ data, editable, onEdit, onDelete }: CrudTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-50 border border-gray-200 rounded-lg border-dashed">
        <p className="text-gray-500">No hay registros en esta sección.</p>
      </div>
    );
  }

  // Extract columns dynamically from the first item, ignoring 'id' and complex objects
  const firstItem = data[0];
  const allKeys = Object.keys(firstItem).filter(k => k !== 'id' && typeof firstItem[k] !== 'object');
  const columns = allKeys.slice(0, 4); // Max 4 columns for display

  return (
    <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map(col => (
              <th key={col} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {col}
              </th>
            ))}
            {editable && (
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((item, idx) => (
            <tr key={item.id || idx} className="hover:bg-gray-50 transition-colors">
              {columns.map(col => (
                <td key={col} className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
