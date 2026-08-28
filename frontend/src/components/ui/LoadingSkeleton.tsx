import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
}

export default function LoadingSkeleton({ rows = 5 }: LoadingSkeletonProps) {
  return (
    <div className="w-full flex flex-col gap-4 p-4 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded-lg w-full"></div>
      ))}
    </div>
  );
}
