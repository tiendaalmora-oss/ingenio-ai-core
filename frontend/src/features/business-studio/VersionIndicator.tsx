import React from 'react';

interface VersionIndicatorProps {
  version: number | null;
}

export default function VersionIndicator({ version }: VersionIndicatorProps) {
  if (version === null) return null;
  return (
    <div className="flex items-center gap-2 text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200 shadow-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-blue-400"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
      </span>
      v{version}
    </div>
  );
}
