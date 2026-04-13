'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronDown, ChevronRight, ExternalLink, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhotoGallery } from '@/components/modules/photos/PhotoGallery';
import { PhotoAttachButton } from '@/components/modules/photos/PhotoAttachButton';
import { MaterialDocsList } from './MaterialDocsList';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { useWorkRecords } from './useWorkRecords';
import { useDeleteWorkRecord } from '@/hooks/useDeleteWorkRecord';
import { EditableCell } from '@/components/shared/EditableCell';
import { canDelete } from '@/utils/can-delete';
import {
  EXECUTION_DOC_TYPE_LABELS,
  EXECUTION_DOC_STATUS_LABELS,
  WORK_RECORD_STATUS_LABELS,
} from '@/utils/constants';
import { StatusProgressBar } from '@/components/shared/StatusProgressBar';
import type { WorkRecordStatus } from '@prisma/client';

interface Props {
  contractId: string;
  projectId?: string;
}

const RECORD_STATUS_COLORS: Record<WorkRecordStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const DOC_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  SIGNED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export function WorkRecordsTable({ contractId, projectId }: Props) {
  const { records, isLoading, updateMutation } = useWorkRecords(contractId);
  const { data: session } = useSession();
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');
  const deleteMutation = useDeleteWorkRecord(projectId ?? '', contractId);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (records.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground border rounded-md">
        Нет данных
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        {/* Заголовок */}
        <div className="grid grid-cols-[32px_100px_1fr_1fr_120px_120px_180px_80px] items-center px-2 py-2 border-b bg-muted/50">
          <div />
          <span className="text-xs uppercase font-medium text-muted-foreground">Дата</span>
          <span className="text-xs uppercase font-medium text-muted-foreground">Шифр / Вид работ</span>
          <span className="text-xs uppercase font-medium text-muted-foreground">Место</span>
          <span className="text-xs uppercase font-medium text-muted-foreground">Статус</span>
          <span className="text-xs uppercase font-medium text-muted-foreground">Статус ИД</span>
          <span className="text-xs uppercase font-medium text-muted-foreground">Материалы</span>
          <div />
        </div>

        {/* Строки */}
        {records.map((record) => {
          const isExpanded = expandedIds.has(record.id);
          const docs = record.executionDocs ?? [];
          const signedCount = docs.filter((d) => d.status === 'SIGNED').length;
          // WorkRecord не имеет createdById — разрешаем удаление только ADMIN
          const showDelete = projectId && canDelete(
            session?.user.id ?? '',
            session?.user.role ?? 'WORKER',
            undefined
          );

          return (
            <div key={record.id} className="border-b last:border-b-0">
              {/* Основная строка */}
              <div
                className="grid grid-cols-[32px_100px_1fr_1fr_120px_120px_180px_80px] items-center px-2 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => toggleExpand(record.id)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); toggleExpand(record.id); }}
                >
                  {isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5" />
                    : <ChevronRight className="h-3.5 w-3.5" />}
                </Button>
                <EditableCell
                  value={record.date ? record.date.slice(0, 10) : ''}
                  type="date"
                  onSave={async (v) => { await updateMutation.mutateAsync({ id: record.id, data: { date: v } }); }}
                />
                <div>
                  <span className="font-mono text-xs text-muted-foreground">{record.workItem.projectCipher}</span>
                  <p className="text-sm truncate">{record.workItem.name}</p>
                </div>
                <EditableCell
                  value={record.location}
                  onSave={async (v) => { await updateMutation.mutateAsync({ id: record.id, data: { location: v } }); }}
                />
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium w-fit ${RECORD_STATUS_COLORS[record.status]}`}>
                  {WORK_RECORD_STATUS_LABELS[record.status]}
                </span>
                <StatusProgressBar signed={signedCount} total={docs.length} />
                <span className="text-xs text-muted-foreground truncate">
                  {record.writeoffs.length > 0
                    ? `${record.writeoffs.length} мат.`
                    : '—'}
                </span>
                {showDelete ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTargetId(record.id);
                      setDeleteTargetName(record.workItem.name);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Удалить
                  </Button>
                ) : <div />}
              </div>

              {/* Раскрытая секция с вкладками */}
              {isExpanded && (
                <div className="bg-muted/30 border-t px-6 py-3" onClick={(e) => e.stopPropagation()}>
                  <Tabs defaultValue="acts">
                    <TabsList className="h-7 mb-2">
                      <TabsTrigger value="acts" className="text-xs">
                        Акты ({docs.length})
                      </TabsTrigger>
                      <TabsTrigger value="photos" className="text-xs">
                        Фото
                      </TabsTrigger>
                      <TabsTrigger value="materials-docs" className="text-xs">
                        Документы материалов
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="acts">
                      {docs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Нет связанных актов</p>
                      ) : (
                        <div className="space-y-1.5">
                          {docs.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
                            >
                              <span className="text-xs text-muted-foreground w-32 flex-shrink-0">
                                {EXECUTION_DOC_TYPE_LABELS[doc.type] ?? doc.type}
                              </span>
                              <span className="text-sm flex-1 truncate">
                                № {doc.number}{doc.title && ` — ${doc.title}`}
                              </span>
                              <Badge className={`text-xs flex-shrink-0 ${DOC_STATUS_COLORS[doc.status] ?? ''}`}>
                                {EXECUTION_DOC_STATUS_LABELS[doc.status] ?? doc.status}
                              </Badge>
                              {projectId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                      `/objects/${projectId}/contracts/${contractId}/docs/${doc.id}`
                                    );
                                  }}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="photos">
                      <div className="flex items-center gap-2 mb-2">
                        <PhotoAttachButton entityType="WORK_RECORD" entityId={record.id} />
                      </div>
                      <PhotoGallery entityType="WORK_RECORD" entityId={record.id} />
                    </TabsContent>

                    <TabsContent value="materials-docs">
                      <MaterialDocsList writeoffs={record.writeoffs} />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(v) => { if (!v) setDeleteTargetId(null); }}
        entityName={deleteTargetName}
        warningText="Все списания материалов будут отменены."
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId, {
              onSuccess: () => setDeleteTargetId(null),
            });
          }
        }}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
