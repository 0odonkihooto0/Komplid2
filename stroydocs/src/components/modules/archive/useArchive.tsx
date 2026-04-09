'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useToast } from '@/hooks/useToast';
import { ARCHIVE_CATEGORY_LABELS } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import type { ArchiveCategory } from '@prisma/client';

interface ArchiveDocument {
  id: string;
  category: ArchiveCategory;
  fileName: string;
  s3Key: string;
  mimeType: string;
  size: number;
  sheetNumber: string | null;
  cipher: string | null;
  issueDate: string | null;
  certifiedCopy: boolean;
  certifiedByName: string | null;
  createdAt: string;
  downloadUrl: string;
  certifiedDownloadUrl: string | null;
  uploadedBy: { id: string; firstName: string; lastName: string };
}

/** Форматирование размера файла */
const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

export function useArchive(contractId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: documents = [], isLoading } = useQuery<ArchiveDocument[]>({
    queryKey: ['archive', contractId],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${contractId}/archive`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: {
      file: File;
      category: ArchiveCategory;
      projectId: string;
      sheetNumber?: string;
      cipher?: string;
      issueDate?: string;
    }) => {
      // 1. Создание записи в БД и получение pre-signed URL
      const res = await fetch(
        `/api/objects/${data.projectId}/contracts/${contractId}/archive`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: data.category,
            fileName: data.file.name,
            mimeType: data.file.type,
            size: data.file.size,
            sheetNumber: data.sheetNumber,
            cipher: data.cipher,
            issueDate: data.issueDate,
          }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      // 2. Загрузка файла по pre-signed URL
      await fetch(json.data.uploadUrl, {
        method: 'PUT',
        body: data.file,
        headers: { 'Content-Type': data.file.type },
      });

      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive', contractId] });
      toast({ title: 'Документ загружен' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ projectId, archiveId }: { projectId: string; archiveId: string }) => {
      const res = await fetch(
        `/api/objects/${projectId}/contracts/${contractId}/archive/${archiveId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive', contractId] });
      toast({ title: 'Документ удалён' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const certifyMutation = useMutation({
    mutationFn: async (data: {
      projectId: string;
      archiveId: string;
      certifiedByName: string;
      certifiedByPos: string;
    }) => {
      const res = await fetch(
        `/api/objects/${data.projectId}/contracts/${contractId}/archive/${data.archiveId}/certify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            certifiedByName: data.certifiedByName,
            certifiedByPos: data.certifiedByPos,
          }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive', contractId] });
      toast({ title: 'Штамп "Копия верна" наложен' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const columns: ColumnDef<ArchiveDocument>[] = useMemo(() => [
    {
      accessorKey: 'fileName',
      header: 'Файл',
      cell: ({ row }) => (
        <a
          href={row.original.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline text-sm"
        >
          {row.original.fileName}
        </a>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Категория',
      cell: ({ row }) => ARCHIVE_CATEGORY_LABELS[row.original.category],
    },
    {
      accessorKey: 'size',
      header: 'Размер',
      cell: ({ row }) => formatSize(row.original.size),
    },
    {
      accessorKey: 'certifiedCopy',
      header: 'Копия верна',
      cell: ({ row }) =>
        row.original.certifiedCopy ? (
          <a
            href={row.original.certifiedDownloadUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:underline text-xs"
          >
            Заверено
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Загружен',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ], []);

  return { documents, columns, isLoading, uploadMutation, deleteMutation, certifyMutation };
}
