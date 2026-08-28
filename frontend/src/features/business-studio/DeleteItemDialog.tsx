import React from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface DeleteItemDialogProps {
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteItemDialog({ isOpen, isDeleting, onConfirm, onCancel }: DeleteItemDialogProps) {
  return (
    <ConfirmDialog 
      isOpen={isOpen}
      title="Eliminar registro"
      description="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
      type="danger"
      confirmText="Eliminar"
      isLoading={isDeleting}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
