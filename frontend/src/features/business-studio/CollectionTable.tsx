import React from 'react';
import CollectionRow from './CollectionRow';

interface CollectionTableProps {
  data: any[];
  editable: boolean;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

const COLUMN_LABELS: Record<string, string> = {
  tiempo: 'Tiempo',
  enfoque: 'Enfoque Comercial',
  pautaCreativa: 'Pauta Creativa',
  mensaje: 'Mensaje / Guion',
  nombre: 'Nombre',
  descripcion: 'Descripción',
  categoria: 'Categoría',
  precio: 'Precio',
  motivo: 'Motivo',
  instruccion: 'Instrucción',
};

export default function CollectionTable({ data, editable, onEdit, onDelete }: CollectionTableProps) {
  if (!data || data.length === 0) return null;

  // Extraer claves combinadas de todos los items para no perder columnas si un item no tiene un campo
  const allKeys = Array.from(
    new Set(data.flatMap(item => Object.keys(item || {})))
  ).filter(k => k !== 'id' && typeof data[0]?.[k] !== 'object').slice(0, 5);

  const columns = allKeys.length > 0 ? allKeys : ['tiempo', 'enfoque'];

  return (
    <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map(col => (
              <th key={col} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {COLUMN_LABELS[col] || col}
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
