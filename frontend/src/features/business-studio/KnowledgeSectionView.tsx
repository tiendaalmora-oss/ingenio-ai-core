import React from 'react';
import KnowledgeEditor from './KnowledgeEditor';

interface KnowledgeSectionViewProps {
  data: any;
  sectionKey: string;
  editable: boolean;
}

export default function KnowledgeSectionView({ data, sectionKey, editable }: KnowledgeSectionViewProps) {
  return (
    <KnowledgeEditor 
      sectionKey={sectionKey} 
      initialData={data} 
      editable={editable} 
    />
  );
}
