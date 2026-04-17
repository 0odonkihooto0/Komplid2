'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ReferenceSchema } from '@/lib/references/types';

interface Props {
  schema: ReferenceSchema;
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  entryName?: string;
}

export function DeleteReferenceDialog({ schema, ids, open, onOpenChange, onConfirm, isPending, entryName }: Props) {
  const isBulk = ids.length > 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBulk ? `Удалить ${ids.length} записей?` : `Удалить ${schema.nameSingular}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBulk
              ? `Вы уверены что хотите удалить ${ids.length} записей из справочника «${schema.name}»? Это действие необратимо.`
              : entryName
              ? `Вы уверены что хотите удалить запись «${entryName}»? Это действие необратимо.`
              : `Вы уверены что хотите удалить эту запись? Это действие необратимо.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Удаление...' : 'Удалить'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
