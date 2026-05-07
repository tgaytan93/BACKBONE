import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: string;
  itemName?: string;
  itemType?: string;
  isDeleting?: boolean;
  destructiveAction?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  itemType = 'item',
  isDeleting = false,
  destructiveAction = true,
  confirmButtonText = 'Delete',
  cancelButtonText = 'Cancel',
}: DeleteConfirmationDialogProps) {
  const [internalDeleting, setInternalDeleting] = React.useState(false);

  const defaultTitle = title || `Delete ${itemType}`;
  const defaultDescription =
    description ||
    `Are you sure you want to delete ${
      itemName ? `"${itemName}"` : `this ${itemType}`
    }? This action cannot be undone.`;

  const handleConfirm = async () => {
    setInternalDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error during deletion:', error);
    } finally {
      setInternalDeleting(false);
    }
  };

  const deleting = isDeleting || internalDeleting;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructiveAction && (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            {defaultTitle}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {defaultDescription}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
            className="sm:w-auto w-full"
          >
            {cancelButtonText}
          </Button>
          <Button
            type="button"
            variant={destructiveAction ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={deleting}
            className="sm:w-auto w-full"
          >
            {deleting && <Spinner size="sm" className="mr-2" />}
            {confirmButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
