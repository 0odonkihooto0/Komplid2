'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useJournalRequisites, type RequisitesForm } from './useJournalRequisites';
import type { JournalDetail } from './journal-constants';

interface Props {
  objectId: string;
  journalId: string;
  journal: JournalDetail;
}

type OrgKey = Extract<keyof RequisitesForm, 'customer' | 'generalContractor' | 'constructionControl' | 'authorSupervision' | 'stateSupervision'>;

const REQUISITE_LABELS: { key: OrgKey; label: string }[] = [
  { key: 'customer', label: 'Заказчик' },
  { key: 'generalContractor', label: 'Генеральный подрядчик' },
  { key: 'constructionControl', label: 'Строительный контроль' },
  { key: 'authorSupervision', label: 'Авторский надзор' },
  { key: 'stateSupervision', label: 'Государственный надзор' },
];

export function JournalRequisitesTab({ objectId, journalId, journal }: Props) {
  const vm = useJournalRequisites(objectId, journalId, journal);
  const isReadonly = journal.status !== 'ACTIVE';

  if (vm.isParticipantsLoading) {
    return (
      <div className="space-y-3 pt-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  // Формируем список вариантов для Select: юрлица + физлица
  const orgOptions = vm.participants.orgs.map((o) => ({
    value: `org:${o.id}`,
    label: o.organization.name,
  }));
  const personOptions = vm.participants.persons.map((p) => {
    const fullName = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ');
    const label = p.organization ? `${fullName} (${p.organization.name})` : fullName;
    return { value: `person:${p.id}`, label };
  });
  const allOptions = [...orgOptions, ...personOptions];

  return (
    <div className="space-y-6 pt-4">
      {/* Кнопки действий */}
      {!isReadonly && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => vm.fillMutation.mutate()}
            disabled={vm.fillMutation.isPending}
          >
            Проставить реквизиты по умолчанию
          </Button>
          <Button
            size="sm"
            onClick={() => vm.saveMutation.mutate()}
            disabled={vm.saveMutation.isPending}
          >
            Сохранить изменения
          </Button>
        </div>
      )}

      {/* Поля организаций/лиц */}
      <div className="grid gap-4 sm:grid-cols-2">
        {REQUISITE_LABELS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-sm text-muted-foreground">{label}</Label>
            {isReadonly ? (
              <p className="text-sm font-medium">
                {allOptions.find((o) => o.value === vm.form[key])?.label ?? '—'}
              </p>
            ) : (
              <Select
                value={vm.form[key] || 'NONE'}
                onValueChange={(v) => vm.setField(key, v === 'NONE' ? '' : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Не выбрано" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">
                    <span className="text-muted-foreground">Не выбрано</span>
                  </SelectItem>
                  {orgOptions.length > 0 && (
                    <>
                      <SelectItem value="__org_header__" disabled>
                        — Организации —
                      </SelectItem>
                      {orgOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {personOptions.length > 0 && (
                    <>
                      <SelectItem value="__person_header__" disabled>
                        — Физические лица —
                      </SelectItem>
                      {personOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>

      {/* Даты начала и окончания */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-sm text-muted-foreground">Дата начала работ</Label>
          {isReadonly ? (
            <p className="text-sm font-medium">{vm.form.startDate || '—'}</p>
          ) : (
            <Input
              type="date"
              value={vm.form.startDate}
              onChange={(e) => vm.setField('startDate', e.target.value)}
            />
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-sm text-muted-foreground">Дата окончания работ</Label>
          {isReadonly ? (
            <p className="text-sm font-medium">{vm.form.endDate || '—'}</p>
          ) : (
            <Input
              type="date"
              value={vm.form.endDate}
              onChange={(e) => vm.setField('endDate', e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Подсказка в режиме хранения */}
      {isReadonly && (
        <p className="text-xs text-muted-foreground">
          Журнал в режиме хранения — редактирование реквизитов запрещено.
        </p>
      )}
    </div>
  );
}
