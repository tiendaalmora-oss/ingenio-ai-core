import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import KnowledgeSectionView from './KnowledgeSectionView';
import KnowledgeCollectionView from './KnowledgeCollectionView';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

interface KnowledgeContentProps {
  sectionKey: string;
  isCollection: boolean;
  editable?: boolean;
}

export default function KnowledgeContent({ sectionKey, isCollection, editable = true }: KnowledgeContentProps) {
  // We only fetch the object directly if it's NOT a collection.
  // Collections fetch their own array of items inside KnowledgeCollectionView.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['business-studio-knowledge-base', sectionKey],
    queryFn: async () => {
      const res = await api.get(`/business-studio/knowledge-base/${sectionKey}`);
      return res.data;
    },
    enabled: !isCollection,
    refetchOnWindowFocus: false,
  });

  if (!isCollection && isLoading) {
    return (
      <div className="flex-1 w-full h-full bg-white flex flex-col rounded-md border border-gray-200">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (!isCollection && isError) {
    return (
      <div className="flex-1 w-full h-full bg-red-50 flex items-center justify-center rounded-md border border-red-200 text-red-600">
        Error al cargar los datos de la sección.
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col h-full min-h-0">
      {isCollection ? (
        <KnowledgeCollectionView sectionKey={sectionKey} editable={editable} />
      ) : (
        <KnowledgeSectionView data={data} sectionKey={sectionKey} editable={editable} />
      )}
    </div>
  );
}
