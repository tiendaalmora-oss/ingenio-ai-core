import React from 'react';

interface CollectionCounterProps {
  count: number;
  label: string;
}

export default function CollectionCounter({ count, label }: CollectionCounterProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200">
      <span className="w-5 h-5 flex items-center justify-center bg-white rounded-full shadow-sm text-blue-600 font-bold">
        {count}
      </span>
      <span>{label}</span>
    </div>
  );
}
