'use client';

import { Badge } from '@/components/ui/badge';

// Типы для отформатированных данных режима volumes (из compare-formatters.ts)
interface VolumesItem {
  name: string;
  unit: string | null;
  volumeV1: number;
  volumeV2: number;
  delta: number;
  status: 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED';
}

interface VolumesChapter {
  chapterId: string;
  chapterName: string;
  items: VolumesItem[];
}

interface VolumesFormatted {
  chapters: VolumesChapter[];
}

const fmtNum = (v: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v);

const STATUS_STYLES: Record<string, { bg: string; badge: string; label: string }> = {
  ADDED:     { bg: 'bg-green-50 dark:bg-green-950/20', badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0', label: '+ Добавлено' },
  REMOVED:   { bg: 'bg-red-50 dark:bg-red-950/20',     badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-0',       label: '− Удалено' },
  CHANGED:   { bg: 'bg-yellow-50 dark:bg-yellow-950/20', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-0', label: '~ Изменено' },
  UNCHANGED: { bg: '',                                    badge: '',                                                                        label: '' },
};

interface Props {
  formatted: unknown;
}

/** Сопоставительная ведомость объёмов работ */
export function CompareVolumesTable({ formatted }: Props) {
  const data = formatted as VolumesFormatted | undefined;
  if (!data?.chapters?.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Нет данных для отображения</p>;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left">Наименование</th>
            <th className="px-3 py-2 text-left w-16">Ед.</th>
            <th className="px-3 py-2 text-right w-24">Объём V1</th>
            <th className="px-3 py-2 text-right w-24">Объём V2</th>
            <th className="px-3 py-2 text-right w-24">Δ Объём</th>
            <th className="px-3 py-2 text-left w-28">Статус</th>
          </tr>
        </thead>
        <tbody>
          {data.chapters.map((ch) => (
            <ChapterGroup key={ch.chapterId} chapter={ch} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChapterGroup({ chapter }: { chapter: VolumesChapter }) {
  return (
    <>
      {/* Строка раздела */}
      <tr className="border-b bg-muted/30">
        <td colSpan={6} className="px-3 py-2 font-semibold text-sm">
          {chapter.chapterName}
        </td>
      </tr>
      {/* Позиции раздела */}
      {chapter.items.map((item, idx) => {
        const st = STATUS_STYLES[item.status] ?? STATUS_STYLES.UNCHANGED;
        return (
          <tr key={`${chapter.chapterId}-${idx}`} className={`border-b last:border-0 ${st.bg}`}>
            <td className="px-3 py-2 pl-6">{item.name}</td>
            <td className="px-3 py-2 text-muted-foreground">{item.unit ?? '—'}</td>
            <td className="px-3 py-2 text-right tabular-nums">{fmtNum(item.volumeV1)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{fmtNum(item.volumeV2)}</td>
            <td className={`px-3 py-2 text-right tabular-nums ${item.delta > 0 ? 'text-red-600' : item.delta < 0 ? 'text-green-600' : ''}`}>
              {item.delta >= 0 ? '+' : ''}{fmtNum(item.delta)}
            </td>
            <td className="px-3 py-2">
              {st.label && <Badge className={st.badge}>{st.label}</Badge>}
            </td>
          </tr>
        );
      })}
    </>
  );
}
