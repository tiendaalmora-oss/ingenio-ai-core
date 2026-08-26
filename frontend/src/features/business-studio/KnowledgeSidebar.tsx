import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useBusinessStudioStore } from '@/store/business-studio.store';
import { User, Building, Package, Tags, Briefcase, HelpCircle, Shield, FileText, Tag, Repeat, LifeBuoy, Book, Folder, Compass } from 'lucide-react';

const iconMap: Record<string, any> = {
  User, Building, Package, Tags, Briefcase, HelpCircle, Shield, FileText, Tag, Repeat, LifeBuoy, Book, Compass
};

export default function KnowledgeSidebar() {
  const { data: schema, isLoading, isError } = useQuery({
    queryKey: ['business-studio-schema'],
    queryFn: async () => {
      const res = await api.get('/business-studio/schema');
      return res.data;
    }
  });

  const { selectedSection, setSelectedSection } = useBusinessStudioStore();

  if (isLoading) {
    return <div className="w-64 border-r border-gray-200 p-4 flex flex-col gap-2">
      {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded"></div>)}
    </div>;
  }

  if (isError) {
    return <div className="w-64 border-r border-gray-200 p-4 flex flex-col items-center justify-center text-sm text-red-600">
      Error al cargar secciones
    </div>;
  }

  return (
    <div className="w-64 border-r border-gray-200 bg-white overflow-y-auto h-[calc(100vh-4rem)] p-4">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Knowledge Base</h2>
      <ul className="space-y-1">
        {schema?.map((section: any) => {
          const Icon = iconMap[section.icon] || Folder;
          const isActive = selectedSection === section.key;
          return (
            <li key={section.key}>
              <button
                onClick={() => setSelectedSection(section.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                <span className="truncate">{section.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
