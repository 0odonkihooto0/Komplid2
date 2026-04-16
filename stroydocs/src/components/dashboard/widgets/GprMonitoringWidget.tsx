'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGprMonitoringWidget, type DelayGroup } from './useGprMonitoringWidget';

interface Props {
  objectIds?: string[];
}

/** Заголовки диалога по группе светофора */
const DIALOG_TITLES: Record<DelayGroup, string> = {
  green:  'Объекты без отставания',
  yellow: 'Объекты с отставанием 1–60 дней',
  red:    'Объекты с отставанием >60 дней',
};

/** Цвет текста ячейки «Отставание» */
function delayTextClass(delayDays: number): string {
  if (delayDays === 0)  return 'text-green-600';
  if (delayDays <= 60)  return 'text-yellow-500';
  return 'text-red-600';
}

export function GprMonitoringWidget({ objectIds = [] }: Props) {
  const {
    isLoading,
    greenItems,
    yellowItems,
    redItems,
    selectedGroup,
    setSelectedGroup,
    formatDate,
    filteredItems,
  } = useGprMonitoringWidget({ objectIds });

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Мониторинг исполнения ГПР, СМР</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-2">
              {/* Строка легенды с обозначениями групп */}
              <div className="grid grid-cols-3 text-center text-xs text-muted-foreground">
                <div className="flex items-center justify-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />
                  Без отставания
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 inline-block" />
                  1–60 дней
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
                  &gt;60 дней
                </div>
              </div>

              {/* Строка кликабельных счётчиков */}
              <div className="grid grid-cols-3 text-center">
                <button
                  type="button"
                  onClick={() => setSelectedGroup('green')}
                  className="text-2xl font-bold text-green-600 hover:text-green-700 transition-colors"
                  aria-label={`Без отставания: ${greenItems.length} объектов`}
                >
                  {greenItems.length}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroup('yellow')}
                  className="text-2xl font-bold text-yellow-500 hover:text-yellow-600 transition-colors"
                  aria-label={`Отставание 1–60 дней: ${yellowItems.length} объектов`}
                >
                  {yellowItems.length}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroup('red')}
                  className="text-2xl font-bold text-red-600 hover:text-red-700 transition-colors"
                  aria-label={`Отставание более 60 дней: ${redItems.length} объектов`}
                >
                  {redItems.length}
                </button>
              </div>

              {/* Подпись под счётчиками */}
              <p className="text-center text-xs text-muted-foreground">Количество объектов</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог детализации объектов выбранной группы */}
      <Dialog
        open={selectedGroup !== null}
        onOpenChange={(open) => { if (!open) setSelectedGroup(null); }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedGroup ? DIALOG_TITLES[selectedGroup] : ''}
            </DialogTitle>
          </DialogHeader>
          {filteredItems.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Нет объектов в этой группе</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground pr-3">Объект</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-3 whitespace-nowrap">Плановая дата начала</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-3 whitespace-nowrap">Плановая дата окончания</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-3 text-right whitespace-nowrap">Плановый %</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-3 text-right whitespace-nowrap">Фактический %</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right whitespace-nowrap">Отставание</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.objectId} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/objects/${item.objectId}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(item.planStart)}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(item.planEnd)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {item.planPct}%
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {item.factPct}%
                    </td>
                    <td className={`py-2 text-right tabular-nums font-medium ${delayTextClass(item.delayDays)}`}>
                      {item.delayDays === 0 ? '—' : `${item.delayDays} дн.`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
