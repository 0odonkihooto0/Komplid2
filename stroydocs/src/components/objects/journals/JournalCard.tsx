'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft, Plus, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { JournalStatusBadge } from './JournalStatusBadge';
import { JournalTypeBadge } from './JournalTypeBadge';
import { StorageModeBanner } from './StorageModeBanner';
import { JournalEntryList } from './JournalEntryList';
import { CreateEntryDialog } from './CreateEntryDialog';
import { useJournalCard } from './useJournalCard';
import { JOURNAL_TYPE_LABELS } from './journal-constants';

interface Props {
  objectId: string;
  journalId: string;
}

export function JournalCard({ objectId, journalId }: Props) {
  const vm = useJournalCard(objectId, journalId);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{j.number}</h2>
            <JournalTypeBadge type={j.type} />
            <JournalStatusBadge status={j.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {j.title || JOURNAL_TYPE_LABELS[j.type]}
          </p>
          {j.normativeRef && (
            <p className="text-xs text-muted-foreground">{j.normativeRef}</p>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-wrap gap-2">
          {vm.isActive && (
            <Button size="sm" onClick={() => setEntryDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Добавить запись
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              vm.storageMutation.mutate(vm.isActive ? 'DEACTIVATE' : 'ACTIVATE')
            }
            disabled={vm.storageMutation.isPending || j.status === 'CLOSED'}
          >
            {vm.isActive ? (
              <>
                <Lock className="mr-1 h-4 w-4" />
                На хранение
              </>
            ) : (
              <>
                <Unlock className="mr-1 h-4 w-4" />
                Активировать
              </>
            )}
          </Button>
        </div>
      </div>

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

      {/* Список записей */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold">
          Записи ({vm.entriesTotal})
        </h3>
        <JournalEntryList
          entries={vm.entries}
          isLoading={vm.isEntriesLoading}
          statusFilter={vm.statusFilter}
          onStatusFilterChange={vm.setStatusFilter}
          hasFilters={vm.hasFilters}
          onResetFilters={vm.handleResetFilters}
          onRowClick={vm.handleEntryClick}
        />
      </div>

      {/* Диалог создания записи */}
      {vm.journal && (
        <CreateEntryDialog
          open={entryDialogOpen}
          onOpenChange={setEntryDialogOpen}
          journalType={j.type}
          isPending={vm.createEntryMutation.isPending}
          onSubmit={(payload) => {
            vm.createEntryMutation.mutate(payload, {
              onSuccess: () => setEntryDialogOpen(false),
            });
          }}
        />
      )}
    </div>
  );
}
