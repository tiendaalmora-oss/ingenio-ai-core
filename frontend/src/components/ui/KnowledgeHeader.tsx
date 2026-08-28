import React from 'react';
import Breadcrumb from './Breadcrumb';
import VersionIndicator from './VersionIndicator';

interface KnowledgeHeaderProps {
  title: string;
  description: string;
  version: number | null;
  breadcrumbItems: { label: string; href?: string }[];
}

export default function KnowledgeHeader({ title, description, version, breadcrumbItems }: KnowledgeHeaderProps) {
  return (
    <div className="mb-6 pb-4 border-b border-gray-200">
      <Breadcrumb items={breadcrumbItems} />
      <div className="flex items-center justify-between mt-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <VersionIndicator version={version} />
      </div>
    </div>
  );
}
