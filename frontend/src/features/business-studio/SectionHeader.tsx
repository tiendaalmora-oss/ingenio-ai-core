import React from 'react';
import VersionIndicator from './VersionIndicator';
import { useBusinessStudioStore } from '@/store/business-studio.store';

interface SectionHeaderProps {
  title: string;
  description: string;
}

export default function SectionHeader({ title, description }: SectionHeaderProps) {
  const { currentVersion } = useBusinessStudioStore();

  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <div>
        <VersionIndicator version={currentVersion} />
      </div>
    </div>
  );
}
