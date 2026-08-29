'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import KnowledgeSidebar from '@/features/business-studio/KnowledgeSidebar';
import KnowledgeContent from '@/features/business-studio/KnowledgeContent';
import KnowledgeHeader from '@/components/ui/KnowledgeHeader';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useBusinessStudioStore } from '@/store/business-studio.store';
import { useBootstrapStore } from '@/store/bootstrap.store';

export default function BusinessStudioPage() {
  const { selectedSection, setSelectedSection, currentVersion, setCurrentVersion } =
    useBusinessStudioStore();
  const { data: bootstrapData } = useBootstrapStore();

  const { data: schema, isLoading, isError } = useQuery({
    queryKey: ['business-studio-schema'],
    queryFn: async () => {
      const res = await api.get('/business-studio/schema');
      return res.data;
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (bootstrapData?.version !== undefined) {
      setCurrentVersion(bootstrapData.version);
    }
  }, [bootstrapData, setCurrentVersion]);

  useEffect(() => {
    if (schema && schema.length > 0 && !selectedSection) {
      setSelectedSection(schema[0].key);
    }
  }, [schema, selectedSection, setSelectedSection]);

  const activeSchema = schema?.find((s: any) => s.key === selectedSection);

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center text-red-600 text-sm">
        Error al cargar el esquema del Business Studio.
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200">

      {/* Mobile Horizontal Section Navigation Bar */}
      <div className="md:hidden bg-white border-b border-gray-200 p-2 overflow-x-auto shrink-0 flex gap-1.5 scrollbar-none">
        {schema?.map((section: any) => {
          const isActive = selectedSection === section.key;
          return (
            <button
              key={section.key}
              onClick={() => setSelectedSection(section.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{section.title}</span>
            </button>
          );
        })}
      </div>

      {/* Left: Knowledge Sidebar (Desktop only) */}
      <KnowledgeSidebar />

      {/* Right: Content area (Full width on mobile) */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-gray-50/50">
        {isLoading ? (
          <div className="flex-1 p-3 sm:p-6">
            <LoadingSkeleton rows={6} />
          </div>
        ) : activeSchema ? (
          <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-6 gap-3 sm:gap-4">
            <KnowledgeHeader
              title={activeSchema.title}
              description={activeSchema.description}
              version={currentVersion}
              breadcrumbItems={[
                { label: 'Business Studio' },
                { label: activeSchema.title },
              ]}
            />
            <div className="flex-1 min-h-0">
              <KnowledgeContent
                sectionKey={activeSchema.key}
                isCollection={activeSchema.collection}
                editable={activeSchema.editable}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Seleccione una sección del Knowledge Base
          </div>
        )}
      </div>
    </div>
  );
}
