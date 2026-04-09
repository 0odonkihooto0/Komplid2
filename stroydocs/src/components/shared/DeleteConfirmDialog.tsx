'use client';

import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Название удаляемого объекта (подставляется в заголовок) */
  entityName: string;
  /** Дополнительное предупреждение, например "Списания будут отменены" */
  warningText?: string;
  onConfirm: () => void;
  isPending: boolean;
}

/** Диалог подтверждения удаления. Используется во всех таблицах. */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  entityName,
  warningText,
  onConfirm,
  isPending,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Удалить {entityName}?</DialogTitle>
          <DialogDescription>
            Это действие необратимо.{warningText ? ` ${warningText}` : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Удаление...
              </>
            ) : (
              'Удалить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
