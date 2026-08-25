import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useBusinessStudioStore } from '@/store/business-studio.store';
import { useBootstrapStore } from '@/store/bootstrap.store';
import CollectionToolbar from './CollectionToolbar';
import CollectionTable from './CollectionTable';
import ItemEditorDialog from './ItemEditorDialog';
import DeleteItemDialog from './DeleteItemDialog';
import EmptyCollectionState from './EmptyCollectionState';
import ConflictDialog from './ConflictDialog';
import CollectionCounter from '@/components/ui/CollectionCounter';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

interface KnowledgeCollectionViewProps {
  sectionKey: string;
  editable: boolean;
}

export default function KnowledgeCollectionView({ sectionKey, editable }: KnowledgeCollectionViewProps) {
  const queryClient = useQueryClient();
  const { currentVersion, setCurrentVersion } = useBusinessStudioStore();
  const setBootstrapData = useBootstrapStore(s => s.setBootstrapData);
  const bootstrapData = useBootstrapStore(s => s.data);

  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [showConflict, setShowConflict] = useState(false);

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['business-studio-knowledge-collection', sectionKey],
    queryFn: async () => {
      const res = await api.get(`/business-studio/knowledge-base/${sectionKey}/items`);
      return res.data;
    },
    refetchOnWindowFocus: false,
  });

  const onSuccessMutation = () => {
    const newVersion = (currentVersion || 0) + 1;
    setCurrentVersion(newVersion);
    setBootstrapData({ ...bootstrapData, version: newVersion });
    queryClient.invalidateQueries({ queryKey: ['business-studio-knowledge-collection', sectionKey] });
    setEditorOpen(false);
    setDeleteOpen(false);
  };

  const onErrorMutation = (error: any) => {
    if (error.response?.status === 409) {
      setShowConflict(true);
    } else {
      alert('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  const createMutation = useMutation({
    mutationFn: async (newItem: any) => {
      const res = await api.post(`/business-studio/knowledge-base/${sectionKey}/items`, newItem, {
        headers: { 'x-knowledge-version': currentVersion }
      });
      return res.data;
    },
    onSuccess: onSuccessMutation,
    onError: onErrorMutation
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedItem: any) => {
      const res = await api.put(`/business-studio/knowledge-base/${sectionKey}/items/${updatedItem.id}`, updatedItem, {
        headers: { 'x-knowledge-version': currentVersion }
      });
      return res.data;
    },
    onSuccess: onSuccessMutation,
    onError: onErrorMutation
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/business-studio/knowledge-base/${sectionKey}/items/${id}`, {
        headers: { 'x-knowledge-version': currentVersion }
      });
      return res.data;
    },
    onSuccess: onSuccessMutation,
    onError: onErrorMutation
  });

  const handleAdd = () => {
    setSelectedItem(null);
    setEditorOpen(true);
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setEditorOpen(true);
  };

  const handleDeleteRequest = (item: any) => {
    setItemToDelete(item);
    setDeleteOpen(true);
  };

  const handleSave = (data: any) => {
    if (data.id && selectedItem?.id) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const confirmDelete = () => {
    if (itemToDelete?.id) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  const handleReload = () => {
    setShowConflict(false);
    queryClient.invalidateQueries({ queryKey: ['business-studio-knowledge-collection', sectionKey] });
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-md border border-gray-200 shadow-sm p-4 h-full">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (isError) {
    return <div className="h-64 bg-red-50 text-red-600 flex items-center justify-center rounded-md border border-red-200">Error al cargar elementos.</div>;
  }

  const filteredItems = Array.isArray(items) ? items.filter((item: any) => {
    if (!search) return true;
    return JSON.stringify(item).toLowerCase().includes(search.toLowerCase());
  }) : [];

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return (
    <div className="flex flex-col space-y-4 h-full min-h-0">
      <div className="flex items-center justify-between">
        <CollectionCounter count={filteredItems.length} label="Registros Encontrados" />
      </div>
      <CollectionToolbar 
        onAdd={handleAdd} 
        search={search} 
        onSearchChange={setSearch} 
        editable={editable} 
      />
      
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredItems.length === 0 ? (
          <EmptyCollectionState />
        ) : (
          <CollectionTable 
            data={filteredItems} 
            editable={editable}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />
        )}
      </div>

      <ItemEditorDialog 
        isOpen={editorOpen}
        sectionKey={sectionKey}
        item={selectedItem}
        onSave={handleSave}
        onClose={() => setEditorOpen(false)}
        isSaving={isSaving}
      />

      <DeleteItemDialog 
        isOpen={deleteOpen}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <ConflictDialog 
        isOpen={showConflict} 
        onReload={handleReload} 
        onClose={() => setShowConflict(false)} 
      />
    </div>
  );
}
