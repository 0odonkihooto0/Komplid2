'use client';

import { useRouter } from 'next/navigation';
import { JournalEntryList } from './JournalEntryList';
import { CreateEntryDialog } from './CreateEntryDialog';
import type { SpecialJournalType, JournalEntryStatus } from '@prisma/client';
import type { CreateJournalEntryInput } from '@/lib/validations/journal-schemas';
import type { JournalEntryItem } from './journal-constants';

interface Props {
  objectId: string;
  journalId: string;
  journalType: SpecialJournalType;
  isActive: boolean;
  entries: JournalEntryItem[];
  isEntriesLoading: boolean;
  statusFilter: JournalEntryStatus | '';
  onStatusFilterChange: (v: JournalEntryStatus | '') => void;
  hasFilters: boolean;
  onResetFilters: () => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
  onDelete: (entry: JournalEntryItem) => void;
  onDuplicate: (entry: JournalEntryItem) => void;
  onCreateLink: (entry: JournalEntryItem) => void;
  onCreateExecDoc: (entry: JournalEntryItem) => void;
  // Диалог создания записи
  entryDialogOpen: boolean;
  onEntryDialogChange: (open: boolean) => void;
  isCreatingEntry: boolean;
  onCreateEntry: (payload: CreateJournalEntryInput, files: File[], sectionId?: string) => void;
  sectionIdForEntry?: string;
}

export function JournalEntriesTab({
  objectId,
  journalId,
  journalType,
  isActive,
  entries,
  isEntriesLoading,
  statusFilter,
  onStatusFilterChange,
  hasFilters,
  onResetFilters,
  selectedIds,
  onSelectionChange,
  onBulkDelete,
  onDelete,
  onDuplicate,
  onCreateLink,
  onCreateExecDoc,
  entryDialogOpen,
  onEntryDialogChange,
  isCreatingEntry,
  onCreateEntry,
  sectionIdForEntry,
}: Props) {
  const router = useRouter();

  // Навигация к детальной странице записи
  function handleInfo(entry: JournalEntryItem) {
    router.push(`/objects/${objectId}/journals/${journalId}/${entry.id}`);
  }

  // Редактирование — переход к записи (детальная страница содержит форму редактирования)
  function handleEdit(entry: JournalEntryItem) {
    router.push(`/objects/${objectId}/journals/${journalId}/${entry.id}`);
  }

  // Замечания — переход к записи с якорем
  function handleRemarks(entry: JournalEntryItem) {
    router.push(`/objects/${objectId}/journals/${journalId}/${entry.id}#remarks`);
  }

  return (
    <div className="space-y-2 pt-4">
      <JournalEntryList
        objectId={objectId}
        journalId={journalId}
        entries={entries}
        isLoading={isEntriesLoading}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        hasFilters={hasFilters}
        onResetFilters={onResetFilters}
        onRowClick={handleInfo}
        journalType={journalType}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        onBulkDelete={onBulkDelete}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onEdit={handleEdit}
        onInfo={handleInfo}
        onRemarks={handleRemarks}
        onCreateLink={onCreateLink}
        onCreateExecDoc={onCreateExecDoc}
      />

      {/* Диалог создания записи — рендерим только при активном журнале */}
      {isActive && (
        <CreateEntryDialog
          open={entryDialogOpen}
          onOpenChange={onEntryDialogChange}
          journalType={journalType}
          isPending={isCreatingEntry}
          onSubmit={(payload, files) =>
            onCreateEntry(payload, files, sectionIdForEntry)
          }
        />
      )}
    </div>
  );
}
