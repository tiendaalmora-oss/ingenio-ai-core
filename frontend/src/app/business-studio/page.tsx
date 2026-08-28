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
    /* Full-height flex container — no PageContainer wrapper needed here,
       AppLayout's <main> already provides padding and scrolling */
    <div className="flex h-full overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200">

      {/* Left: Knowledge Sidebar */}
      <KnowledgeSidebar />

      {/* Right: Content area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-gray-50">
        {isLoading ? (
          <div className="flex-1 p-6">
            <LoadingSkeleton rows={6} />
          </div>
        ) : activeSchema ? (
          <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
            <KnowledgeHeader
              title={activeSchema.title}
              description={activeSchema.description}
              version={currentVersion}
              breadcrumbItems={[
                { label: 'Business Studio' },
                { label: activeSchema.title },
              ]}
            />
            <div className="flex-1 overflow-hidden">
              <KnowledgeContent
                sectionKey={activeSchema.key}
                isCollection={activeSchema.collection}
                editable={activeSchema.editable}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">
            Seleccione una sección del Knowledge Base
          </div>
        )}
      </div>
    </div>
  );
}
