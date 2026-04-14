'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StorageModeBanner } from './StorageModeBanner';
import { JournalCardHeader } from './JournalCardHeader';
import { JournalEntriesTab } from './JournalEntriesTab';
import { JournalRequisitesTab } from './JournalRequisitesTab';
import { JournalSectionsView } from './JournalSectionsView';
import { JournalRemarksTab } from './JournalRemarksTab';
import { JournalApprovalTab } from './JournalApprovalTab';
import { JournalEntryLinkDialog } from './JournalEntryLinkDialog';
import { ExcelImportDialog } from './ExcelImportDialog';
import { useJournalCard } from './useJournalCard';
import type { JournalEntryItem } from './journal-constants';

interface Props {
  objectId: string;
  journalId: string;
}

export function JournalCard({ objectId, journalId }: Props) {
  const vm = useJournalCard(objectId, journalId);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [sectionIdForEntry, setSectionIdForEntry] = useState<string | undefined>(undefined);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkSourceEntry, setLinkSourceEntry] = useState<JournalEntryItem | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const isOzr = vm.journal?.type === 'OZR_1026PR';

  if (vm.isJournalLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        Загрузка журнала...
      </div>
    );
  }

  if (!vm.journal) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground text-sm mb-4">Журнал не найден</p>
        <Button variant="outline" size="sm" onClick={vm.handleBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          К реестру
        </Button>
      </div>
    );
  }

  const j = vm.journal;
  const displayName = (u: { firstName: string | null; lastName: string | null }) =>
    [u.lastName, u.firstName].filter(Boolean).join(' ') || '—';

  return (
    <div className="space-y-4 p-6">
      {/* Навигация назад */}
      <Button variant="ghost" size="sm" onClick={vm.handleBack} className="gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        К реестру
      </Button>

      {/* Баннер режима хранения */}
      {!vm.isActive && <StorageModeBanner />}

      {/* Шапка журнала */}
      <JournalCardHeader
        objectId={objectId}
        journalId={journalId}
        journal={j}
        isActive={vm.isActive}
        onAddEntry={() => setEntryDialogOpen(true)}
        onImportExcel={() => setImportDialogOpen(true)}
        onStartApproval={() => vm.startApprovalMutation.mutate()}
        isStartingApproval={vm.startApprovalMutation.isPending}
        onToggleStorage={() => vm.storageMutation.mutate(vm.isActive ? 'DEACTIVATE' : 'ACTIVATE')}
        isTogglingStorage={vm.storageMutation.isPending}
      />

      {/* Информационная сетка */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <span className="text-muted-foreground">Ответственный</span>
          <p className="font-medium">{displayName(j.responsible)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Создал</span>
          <p className="font-medium">{displayName(j.createdBy)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Договор</span>
          <p className="font-medium">{j.contract?.number ?? '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Открыт</span>
          <p className="font-medium">
            {format(new Date(j.openedAt), 'd MMM yyyy', { locale: ru })}
          </p>
        </div>
      </div>

      <Separator />

      {/* Вкладки: Реквизиты / Разделы (только OZR_1026PR) / Записи / Замечания */}
      <Tabs defaultValue={isOzr ? 'sections' : 'requisites'}>
        <TabsList>
          <TabsTrigger value="requisites">Реквизиты</TabsTrigger>
          {isOzr && <TabsTrigger value="sections">Разделы</TabsTrigger>}
          <TabsTrigger value="entries">Записи ({vm.entriesTotal})</TabsTrigger>
          <TabsTrigger value="remarks" className="flex items-center gap-1">
            Замечания
            {vm.remarksTotal > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {vm.remarksTotal}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-1">
            Согласование
            {j.approvalRoute && (
              <Badge
                variant="secondary"
                className={`ml-1 h-5 px-1.5 text-xs ${
                  j.approvalRoute.status === 'APPROVED'
                    ? 'bg-green-100 text-green-800'
                    : j.approvalRoute.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {j.approvalRoute.status === 'APPROVED'
                  ? 'Согласован'
                  : j.approvalRoute.status === 'REJECTED'
                  ? 'Отклонён'
                  : 'На согласовании'}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requisites">
          <JournalRequisitesTab objectId={objectId} journalId={journalId} journal={j} />
        </TabsContent>

        {isOzr && (
          <TabsContent value="sections">
            <JournalSectionsView
              objectId={objectId}
              journalId={journalId}
              isActive={vm.isActive}
              onAddEntry={(sid) => {
                setSectionIdForEntry(sid);
                setEntryDialogOpen(true);
              }}
            />
          </TabsContent>
        )}

        <TabsContent value="entries">
          <JournalEntriesTab
            objectId={objectId}
            journalId={journalId}
            journalType={j.type}
            isActive={vm.isActive}
            entries={vm.entries}
            isEntriesLoading={vm.isEntriesLoading}
            statusFilter={vm.statusFilter}
            onStatusFilterChange={vm.setStatusFilter}
            hasFilters={vm.hasFilters}
            onResetFilters={vm.handleResetFilters}
            selectedIds={vm.selectedIds}
            onSelectionChange={vm.setSelectedIds}
            onBulkDelete={(ids) => vm.bulkDeleteMutation.mutate(ids)}
            onDelete={(entry) => vm.deleteEntryMutation.mutate(entry.id)}
            onDuplicate={(entry) => vm.duplicateMutation.mutate(entry.id)}
            onCreateLink={(entry) => {
              setLinkSourceEntry(entry);
              setLinkDialogOpen(true);
            }}
            onCreateExecDoc={(entry) => vm.createExecDocMutation.mutate(entry.id)}
            entryDialogOpen={entryDialogOpen}
            onEntryDialogChange={(open) => {
              setEntryDialogOpen(open);
              if (!open) setSectionIdForEntry(undefined);
            }}
            isCreatingEntry={vm.createEntryMutation.isPending}
            onCreateEntry={(payload, files, sid) =>
              void vm.handleCreateEntry(payload, files, sid).then(() => {
                setEntryDialogOpen(false);
                setSectionIdForEntry(undefined);
              })
            }
            sectionIdForEntry={sectionIdForEntry}
          />
        </TabsContent>

        <TabsContent value="remarks">
          <JournalRemarksTab objectId={objectId} journalId={journalId} journal={j} />
        </TabsContent>

        <TabsContent value="approval">
          <JournalApprovalTab objectId={objectId} journalId={journalId} journal={j} />
        </TabsContent>
      </Tabs>

      {/* Диалог импорта записей из Excel */}
      <ExcelImportDialog
        objectId={objectId}
        journalId={journalId}
        journalType={j.type}
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => {}}
      />

      {/* Диалог добавления связи с записью ЖВК */}
      {linkSourceEntry && (
        <JournalEntryLinkDialog
          open={linkDialogOpen}
          onClose={() => {
            setLinkDialogOpen(false);
            setLinkSourceEntry(null);
          }}
          objectId={objectId}
          sourceEntryId={linkSourceEntry.id}
          isLoading={vm.createLinkMutation.isPending}
          onConfirm={(targetEntryId, linkType) => {
            vm.createLinkMutation.mutate(
              { sourceEntryId: linkSourceEntry.id, targetEntryId, linkType },
              {
                onSuccess: () => {
                  setLinkDialogOpen(false);
                  setLinkSourceEntry(null);
                },
              },
            );
          }}
        />
      )}
    </div>
  );
}
