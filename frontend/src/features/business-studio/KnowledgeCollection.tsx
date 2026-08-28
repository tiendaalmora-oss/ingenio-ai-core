import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useBusinessStudioStore } from '@/store/business-studio.store';
import { useBootstrapStore } from '@/store/bootstrap.store';
import CrudToolbar from './CrudToolbar';
import CrudTable from './CrudTable';
import ItemEditorModal from './ItemEditorModal';
import DeleteDialog from './DeleteDialog';
import ConflictDialog from './ConflictDialog';

interface KnowledgeCollectionProps {
  sectionKey: string;
  editable: boolean;
}

export default function KnowledgeCollection({ sectionKey, editable }: KnowledgeCollectionProps) {
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

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['bundle-items', sectionKey],
    queryFn: async () => {
      const res = await api.get(`/business-studio/knowledge-base/${sectionKey}/items`);
      return res.data;
    },
    refetchOnWindowFocus: false,
  });

  const onSuccessMutation = (updatedData?: any) => {
    const newVersion = (currentVersion || 0) + 1;
    setCurrentVersion(newVersion);
    setBootstrapData({ ...bootstrapData, version: newVersion });
    queryClient.invalidateQueries({ queryKey: ['bundle-items', sectionKey] });
    setEditorOpen(false);
    setDeleteOpen(false);
  };

  const onErrorMutation = (error: any) => {
    if (error.response?.status === 409) {
      setShowConflict(true);
    } else {
      alert('Error en la operación: ' + (error.response?.data?.message || error.message));
    }
  };

  const addMutation = useMutation({
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
      addMutation.mutate(data);
    }
  };

  const confirmDelete = () => {
    if (itemToDelete?.id) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  const handleReload = () => {
    setShowConflict(false);
    queryClient.invalidateQueries({ queryKey: ['bundle-items', sectionKey] });
  };

  const isSaving = addMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const filteredItems = items.filter((item: any) => {
    if (!search) return true;
    const str = JSON.stringify(item).toLowerCase();
    return str.includes(search.toLowerCase());
  });

  if (isLoading) {
    return <div className="h-64 bg-gray-100 animate-pulse rounded-md"></div>;
  }

  return (
    <div className="flex flex-col space-y-4">
      <CrudToolbar 
        onAdd={handleAdd} 
        search={search} 
        onSearchChange={setSearch} 
        editable={editable} 
      />
      
      <CrudTable 
        data={filteredItems} 
        editable={editable}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
      />

      <ItemEditorModal 
        isOpen={editorOpen}
        item={selectedItem}
        onSave={handleSave}
        onClose={() => setEditorOpen(false)}
        isSaving={isSaving}
      />

      <DeleteDialog 
        isOpen={deleteOpen}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <ConflictDialog isOpen={showConflict} onReload={handleReload} onClose={() => setShowConflict(false)} />
    </div>
  );
}
