import React from 'react';

interface VersionIndicatorProps {
  version: number | null;
}

export default function VersionIndicator({ version }: VersionIndicatorProps) {
  if (version === null) return null;
  return (
    <div className="flex items-center gap-2 text-xs font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm transition-all hover:bg-blue-100">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-blue-400"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
      </span>
      KOS v{version}
    </div>
  );
}
