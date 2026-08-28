import React from 'react';
import CollectionRow from './CollectionRow';

interface CollectionTableProps {
  data: any[];
  editable: boolean;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export default function CollectionTable({ data, editable, onEdit, onDelete }: CollectionTableProps) {
  const firstItem = data[0];
  const columns = Object.keys(firstItem).filter(k => k !== 'id' && typeof firstItem[k] !== 'object').slice(0, 5);

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
            <CollectionRow 
              key={item.id || idx} 
              item={item} 
              columns={columns} 
              editable={editable}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
