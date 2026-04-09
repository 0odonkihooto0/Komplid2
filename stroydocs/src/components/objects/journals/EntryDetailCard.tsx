'use client';

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft, Send, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { JournalTypeBadge } from './JournalTypeBadge';
import { StorageModeBanner } from './StorageModeBanner';
import { EntryRemarksSection } from './EntryRemarksSection';
import { CreateRemarkDialog } from './CreateRemarkDialog';
import { useEntryDetail } from './useEntryDetail';
import {
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_CLASS,
  JOURNAL_TYPE_LABELS,
} from './journal-constants';
import type { SpecialJournalType } from '@prisma/client';

interface Props {
  objectId: string;
  journalId: string;
  entryId: string;
}

// Лейблы полей типо-специфичных данных (read-only рендер)
const DATA_FIELD_LABELS: Partial<Record<string, Record<string, string>>> = {
  CONCRETE_WORKS: {
    structureName: 'Конструкция', concreteClass: 'Класс бетона', concreteMark: 'Марка',
    volume: 'Объём (м³)', placementMethod: 'Способ укладки', mixTemperature: 'Температура смеси (°C)',
    curingMethod: 'Уход за бетоном', testProtocolNumber: '№ протокола', supplierMixPlant: 'Поставщик/завод',
  },
  WELDING_WORKS: {
    jointType: 'Тип соединения', baseMetal: 'Основной металл', thickness: 'Толщина (мм)',
    electrodeMark: 'Марка электрода', weldingMethod: 'Способ сварки',
    welderStampNumber: 'Клеймо сварщика', welderFullName: 'ФИО сварщика',
    controlType: 'Тип контроля', controlResult: 'Результат контроля', controlProtocolNumber: '№ протокола',
  },
  AUTHOR_SUPERVISION: {
    designOrgRepresentative: 'Представитель проектной организации',
    deviationsFound: 'Обнаруженные отклонения', instructions: 'Указания',
    instructionDeadline: 'Срок выполнения', implementationNote: 'Отметка о выполнении',
  },
};

const displayName = (u: { firstName: string | null; lastName: string | null }) =>
  [u.lastName, u.firstName].filter(Boolean).join(' ') || '—';

export function EntryDetailCard({ objectId, journalId, entryId }: Props) {
  const vm = useEntryDetail(objectId, journalId, entryId);

  if (vm.isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        Загрузка записи...
      </div>
    );
  }

  if (!vm.entry) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground text-sm mb-4">Запись не найдена</p>
        <Button variant="outline" size="sm" onClick={vm.handleBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          К журналу
        </Button>
      </div>
    );
  }

  const e = vm.entry;
  const journalType = e.journal.type as SpecialJournalType;
  const fieldLabels = DATA_FIELD_LABELS[journalType] ?? {};

  return (
    <div className="space-y-4 p-6">
      {/* Навигация */}
      <Button variant="ghost" size="sm" onClick={vm.handleBack} className="gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        К журналу
      </Button>

      {!vm.isActive && <StorageModeBanner />}

      {/* Шапка записи */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">Запись №{e.entryNumber}</h2>
            <Badge className={ENTRY_STATUS_CLASS[e.status]} variant="secondary">
              {ENTRY_STATUS_LABELS[e.status]}
            </Badge>
            <JournalTypeBadge type={journalType} />
          </div>
          <p className="text-sm text-muted-foreground">
            {e.journal.title || JOURNAL_TYPE_LABELS[journalType]}
          </p>
        </div>

        {/* Кнопки статус-переходов */}
        {vm.isActive && (
          <div className="flex flex-wrap gap-2">
            {e.status === 'DRAFT' && (
              <Button
                size="sm"
                onClick={() => vm.statusMutation.mutate('SUBMITTED')}
                disabled={vm.statusMutation.isPending}
              >
                <Send className="mr-1 h-4 w-4" />
                На проверку
              </Button>
            )}
            {e.status === 'SUBMITTED' && (
              <>
                <Button
                  size="sm"
                  onClick={() => vm.statusMutation.mutate('APPROVED')}
                  disabled={vm.statusMutation.isPending}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Утвердить
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => vm.statusMutation.mutate('REJECTED')}
                  disabled={vm.statusMutation.isPending}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Отклонить
                </Button>
              </>
            )}
            {e.status === 'REJECTED' && (
              <Button
                size="sm"
                onClick={() => vm.statusMutation.mutate('SUBMITTED')}
                disabled={vm.statusMutation.isPending}
              >
                <Send className="mr-1 h-4 w-4" />
                На проверку повторно
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Метаданные */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <span className="text-muted-foreground">Дата</span>
          <p className="font-medium">{format(new Date(e.date), 'd MMM yyyy', { locale: ru })}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Автор</span>
          <p className="font-medium">{displayName(e.author)}</p>
        </div>
        {e.location && (
          <div>
            <span className="text-muted-foreground">Место</span>
            <p className="font-medium">{e.location}</p>
          </div>
        )}
        {(e.weather || e.temperature !== null) && (
          <div>
            <span className="text-muted-foreground">Погода</span>
            <p className="font-medium">
              {[e.weather, e.temperature !== null ? `${e.temperature}°C` : null]
                .filter(Boolean)
                .join(', ') || '—'}
            </p>
          </div>
        )}
        {e.normativeRef && (
          <div>
            <span className="text-muted-foreground">Норматив</span>
            <p className="font-medium">{e.normativeRef}</p>
          </div>
        )}
        {e.inspectionDate && (
          <div>
            <span className="text-muted-foreground">Дата освидетельствования</span>
            <p className="font-medium">
              {format(new Date(e.inspectionDate), 'd MMM yyyy', { locale: ru })}
            </p>
          </div>
        )}
      </div>

      {/* Описание работ */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground">Описание работ</h3>
        <p className="text-sm whitespace-pre-wrap">{e.description}</p>
      </div>

      {/* Типо-специфичные данные */}
      {e.data && Object.keys(e.data).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Данные: {JOURNAL_TYPE_LABELS[journalType] ?? journalType}
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
            {Object.entries(e.data).map(([key, val]) => {
              if (val === null || val === undefined || val === '') return null;
              return (
                <div key={key}>
                  <span className="text-muted-foreground">{fieldLabels[key] ?? key}</span>
                  <p className="font-medium">
                    {Array.isArray(val) ? val.join(', ') : String(val)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Привязка к ИД */}
      {e.executionDoc && (
        <div className="flex items-center gap-2 text-sm bg-blue-50 rounded-lg p-3">
          <FileText className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-muted-foreground">Связанный ИД:</span>
          <span className="font-medium">
            {e.executionDoc.number} — {e.executionDoc.title}
          </span>
        </div>
      )}

      <Separator />

      {/* Секция замечаний */}
      <EntryRemarksSection
        remarks={e.remarks}
        isActive={vm.isActive}
        onAddClick={() => vm.setRemarkDialogOpen(true)}
        onUpdateRemark={(remarkId, data) => vm.updateRemarkMutation.mutate({ remarkId, data })}
        onDeleteRemark={(remarkId) => vm.deleteRemarkMutation.mutate(remarkId)}
        isPending={
          vm.updateRemarkMutation.isPending ||
          vm.deleteRemarkMutation.isPending
        }
      />

      {/* Диалог создания замечания */}
      <CreateRemarkDialog
        open={vm.remarkDialogOpen}
        onOpenChange={vm.setRemarkDialogOpen}
        isPending={vm.createRemarkMutation.isPending}
        onSubmit={(payload) => {
          vm.createRemarkMutation.mutate(payload, {
            onSuccess: () => vm.setRemarkDialogOpen(false),
          });
        }}
      />
    </div>
  );
}
