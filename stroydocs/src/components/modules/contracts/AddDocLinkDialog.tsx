'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContractDocLinks, type DocLinkType } from './useContractDocLinks';

interface FolderOption {
  id: string;
  name: string;
}

interface DocOption {
  id: string;
  name: string;
  fileName: string;
}

/** Рекурсивный flatten дерева папок в плоский список */
function flattenFolders(
  folders: Array<{ id: string; name: string; children?: unknown[] }>,
): FolderOption[] {
  return folders.flatMap((f) => [
    { id: f.id, name: f.name },
    ...flattenFolders(
      (f.children ?? []) as Array<{ id: string; name: string; children?: unknown[] }>,
    ),
  ]);
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  contractId: string;
  linkType: DocLinkType;
}

const LINK_TYPE_LABELS: Record<DocLinkType, string> = {
  ZNP: 'ЗнП',
  ZNII: 'ЗнИИ',
};

export function AddDocLinkDialog({
  open,
  onOpenChange,
  projectId,
  contractId,
  linkType,
}: Props) {
  const [folderId, setFolderId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const { createMutation } = useContractDocLinks(projectId, contractId, linkType);

  // Загружаем дерево папок объекта (только когда диалог открыт)
  const { data: folderTree = [], isLoading: foldersLoading } = useQuery<
    Array<{ id: string; name: string; children?: unknown[] }>
  >({
    queryKey: ['project-folders', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/folders`);
      const json = await res.json() as { success: boolean; data: Array<{ id: string; name: string; children?: unknown[] }>; error?: string };
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: open,
  });

  const folders = flattenFolders(folderTree);

  // Загружаем документы выбранной папки
  const { data: docs = [], isLoading: docsLoading } = useQuery<DocOption[]>({
    queryKey: ['folder-documents', folderId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/project-documents?folderId=${folderId}`,
      );
      const json = await res.json() as { success: boolean; data: DocOption[]; error?: string };
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!folderId,
  });

  function handleClose(v: boolean) {
    if (!v) {
      setFolderId('');
      setDocumentId('');
    }
    onOpenChange(v);
  }

  function handleConfirm() {
    if (!documentId) return;
    createMutation.mutate(
      { documentId, linkType },
      {
        onSuccess: () => {
          setFolderId('');
          setDocumentId('');
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить документ ({LINK_TYPE_LABELS[linkType]})</DialogTitle>
          <DialogDescription className="sr-only">
            Выберите документ из хранилища объекта
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Шаг 1: выбор папки */}
          <div className="space-y-2">
            <Label>Папка</Label>
            {foldersLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={folderId}
                onValueChange={(v) => {
                  setFolderId(v);
                  // Сбрасываем выбранный документ при смене папки
                  setDocumentId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите папку..." />
                </SelectTrigger>
                <SelectContent>
                  {folders.length === 0 ? (
                    <SelectItem value="_no_folders" disabled>
                      Нет папок в проекте
                    </SelectItem>
                  ) : (
                    folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Шаг 2: выбор документа из папки */}
          {folderId && (
            <div className="space-y-2">
              <Label>Документ</Label>
              {docsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={documentId} onValueChange={setDocumentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите документ..." />
                  </SelectTrigger>
                  <SelectContent>
                    {docs.length === 0 ? (
                      <SelectItem value="_empty" disabled>
                        Папка пуста
                      </SelectItem>
                    ) : (
                      docs.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!documentId || createMutation.isPending}
          >
            {createMutation.isPending ? 'Добавление...' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
