'use client';

import { Lock, Plus, Unlock, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JournalStatusBadge } from './JournalStatusBadge';
import { JournalTypeBadge } from './JournalTypeBadge';
import { JournalPrintMenu } from './JournalPrintMenu';
import { JOURNAL_TYPE_LABELS } from './journal-constants';
import type { JournalDetail } from './journal-constants';

interface Props {
  objectId: string;
  journalId: string;
  journal: JournalDetail;
  isActive: boolean;
  onAddEntry: () => void;
  onImportExcel: () => void;
  onStartApproval: () => void;
  isStartingApproval: boolean;
  onToggleStorage: () => void;
  isTogglingStorage: boolean;
}

export function JournalCardHeader({
  objectId,
  journalId,
  journal: j,
  isActive,
  onAddEntry,
  onImportExcel,
  onStartApproval,
  isStartingApproval,
  onToggleStorage,
  isTogglingStorage,
}: Props) {
  return (
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
        {isActive && (
          <Button size="sm" onClick={onAddEntry}>
            <Plus className="mr-1 h-4 w-4" />
            Добавить запись
          </Button>
        )}
        {isActive && (
          <Button variant="outline" size="sm" onClick={onImportExcel}>
            <Upload className="mr-1 h-4 w-4" />
            Импорт Excel
          </Button>
        )}
        {isActive && !j.approvalRoute && (
          <Button
            size="sm"
            variant="outline"
            onClick={onStartApproval}
            disabled={isStartingApproval}
          >
            На согласование
          </Button>
        )}
        <JournalPrintMenu
          objectId={objectId}
          journalId={journalId}
          journalNumber={j.number}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleStorage}
          disabled={isTogglingStorage || j.status === 'CLOSED'}
        >
          {isActive ? (
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
  );
}
