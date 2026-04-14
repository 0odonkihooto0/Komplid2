'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { RefreshCw, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useJournalSections } from './useJournalSections';
import { ENTRY_STATUS_LABELS, ENTRY_STATUS_CLASS } from './journal-constants';
import type { SectionWithEntries } from './journal-constants';

// Разделы, для которых доступно автозаполнение
const AUTO_FILL_SECTIONS = new Set([1, 2, 3, 5]);

interface Props {
  objectId: string;
  journalId: string;
  isActive: boolean;
  onAddEntry?: (sectionId: string) => void;
}

export function JournalSectionsView({ objectId, journalId, isActive, onAddEntry }: Props) {
  const { sections, isLoading, fillMutation } = useJournalSections(objectId, journalId);
  const [confirmSection, setConfirmSection] = useState<SectionWithEntries | null>(null);

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Загрузка разделов...
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Разделы не найдены
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue={String(sections[0].sectionNumber)} className="mt-4">
        <TabsList className="flex-wrap h-auto gap-1">
          {sections.map((s) => (
            <TabsTrigger key={s.id} value={String(s.sectionNumber)}>
              Р.{s.sectionNumber}
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map((section) => (
          <TabsContent key={section.id} value={String(section.sectionNumber)} className="mt-4">
            <SectionPanel
              section={section}
              isActive={isActive}
              canAutoFill={AUTO_FILL_SECTIONS.has(section.sectionNumber)}
              isFilling={fillMutation.isPending}
              onFillRequest={() => setConfirmSection(section)}
              onAddEntry={onAddEntry}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Диалог подтверждения автозаполнения */}
      <AlertDialog open={!!confirmSection} onOpenChange={(open) => !open && setConfirmSection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Автозаполнение раздела</AlertDialogTitle>
            <AlertDialogDescription>
              Записи будут добавлены автоматически из данных договора.
              Существующие записи сохранятся.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmSection) {
                  fillMutation.mutate(confirmSection.id);
                  setConfirmSection(null);
                }
              }}
            >
              Заполнить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SectionPanelProps {
  section: SectionWithEntries;
  isActive: boolean;
  canAutoFill: boolean;
  isFilling: boolean;
  onFillRequest: () => void;
  onAddEntry?: (sectionId: string) => void;
}

function SectionPanel({
  section, isActive, canAutoFill, isFilling, onFillRequest, onAddEntry,
}: SectionPanelProps) {
  const displayName = (u: { firstName: string | null; lastName: string | null }) =>
    [u.lastName, u.firstName].filter(Boolean).join(' ') || '—';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-medium text-sm">
          Р.{section.sectionNumber}: {section.title}
        </h3>
        {isActive && (
          <div className="flex gap-2">
            {canAutoFill && (
              <Button
                size="sm"
                variant="outline"
                disabled={isFilling}
                onClick={onFillRequest}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Заполнить
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => onAddEntry?.(section.id)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Добавить
            </Button>
          </div>
        )}
      </div>

      {section.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Нет записей
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs">
                <th className="px-3 py-2 text-left w-10">№</th>
                <th className="px-3 py-2 text-left w-28">Дата</th>
                <th className="px-3 py-2 text-left">Описание</th>
                <th className="px-3 py-2 text-left w-28">Статус</th>
                <th className="px-3 py-2 text-left w-36">Автор</th>
              </tr>
            </thead>
            <tbody>
              {section.entries.map((entry) => (
                <tr key={entry.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground">{entry.entryNumber}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {format(new Date(entry.date), 'd MMM yyyy', { locale: ru })}
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate" title={entry.description}>
                    {entry.description}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      className={`text-xs ${ENTRY_STATUS_CLASS[entry.status]}`}
                      variant="secondary"
                    >
                      {ENTRY_STATUS_LABELS[entry.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {displayName(entry.author)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
