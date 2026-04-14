'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLinkedDocs, useDeleteLinkedDoc } from './useLinkedDocs';
import { AddLinkedDocDialog } from './AddLinkedDocDialog';
import { formatDate } from '@/utils/format';

// Метки типов документов ИД
const TYPE_LABELS: Record<string, string> = {
  AOSR: 'АОСР',
  OZR: 'ОЖР',
  KS_2: 'КС-2',
  KS_3: 'КС-3',
  GENERAL_DOCUMENT: 'Общий',
  KS_6A: 'КС-6а',
  KS_11: 'КС-11',
  KS_14: 'КС-14',
  TECHNICAL_READINESS_ACT: 'АТГ',
};

// Метки статусов документов
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  IN_REVIEW: 'На согласовании',
  SIGNED: 'Подписан',
  REJECTED: 'Отклонён',
};

const STATUS_VARIANTS: Record<string, 'secondary' | 'default' | 'destructive'> = {
  DRAFT: 'secondary',
  IN_REVIEW: 'default',
  SIGNED: 'default',
  REJECTED: 'destructive',
};

interface Props {
  projectId: string;
  contractId: string;
  docId: string;
}

export function LinkedDocsTab({ projectId, contractId, docId }: Props) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { data, isLoading } = useLinkedDocs(projectId, contractId, docId);
  const deleteMutation = useDeleteLinkedDoc(projectId, contractId, docId);

  return (
    <div className="space-y-4">
      {/* Кнопка добавления связанного документа */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить связанный документ
        </Button>
      </div>

      {/* Список связанных документов */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center rounded-md border border-dashed py-14 text-center">
          <p className="text-sm text-muted-foreground">Связанных документов нет</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Номер</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Тип</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Статус</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Название</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Дата</th>
                <th className="px-3 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {data.map(({ linkId, linkedDoc }) => (
                <tr key={linkId} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">{linkedDoc.number}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{TYPE_LABELS[linkedDoc.type] ?? linkedDoc.type}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={STATUS_VARIANTS[linkedDoc.status] ?? 'secondary'}>
                      {STATUS_LABELS[linkedDoc.status] ?? linkedDoc.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{linkedDoc.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(linkedDoc.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Link href={`/objects/${projectId}/contracts/${linkedDoc.contract.id}/docs/${linkedDoc.id}`}>
                        <Button variant="ghost" size="icon" aria-label="Открыть документ">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Удалить связь"
                        onClick={() => deleteMutation.mutate(linkId)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddLinkedDocDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
        contractId={contractId}
        docId={docId}
      />
    </div>
  );
}
