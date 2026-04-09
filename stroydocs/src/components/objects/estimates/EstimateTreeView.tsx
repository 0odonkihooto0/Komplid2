'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlusCircle, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useEstimateTree } from '@/hooks/useEstimateTree';
import { EstimateChapterSection } from './EstimateChapterSection';

// Форматирование суммы в рублях
const formatRub = (amount: number | null) => {
  if (amount === null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
};

const VERSION_TYPE_LABELS = {
  BASELINE: { label: 'Базовая', variant: 'default' as const },
  ACTUAL: { label: 'Актуальная', variant: 'secondary' as const },
  CORRECTIVE: { label: 'Корректировка', variant: 'outline' as const },
};

interface Props {
  objectId: string;
  contractId: string;
  versionId: string;
}

/** Иерархическая таблица сметы — ШАГ 6 */
export function EstimateTreeView({ objectId, contractId, versionId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');

  const { version, isLoading, addChapter } = useEstimateTree({
    projectId: objectId,
    contractId,
    versionId,
  });

  // Сохранить новый раздел
  const handleAddChapter = async () => {
    const name = newChapterName.trim();
    if (!name) return;
    await addChapter.mutateAsync(name);
    setNewChapterName('');
    setAddingChapter(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-5/6" />
      </div>
    );
  }

  if (!version) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Версия сметы не найдена
      </div>
    );
  }

  const typeCfg = VERSION_TYPE_LABELS[version.versionType];
  // Только главы верхнего уровня (parentId === null)
  const topChapters = version.chapters.filter((c) => c.parentId === null);

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/objects/${objectId}/estimates/list`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Все сметы
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{version.name}</h1>
              <Badge variant={typeCfg.variant}>{typeCfg.label}</Badge>
              {version.isActual && <Badge variant="secondary">Актуальная</Badge>}
            </div>
            {version.period && (
              <p className="text-xs text-muted-foreground">Период: {version.period}</p>
            )}
          </div>
        </div>
        {/* KPI: итого */}
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Итого по смете</p>
          <p className="text-xl font-bold tabular-nums">{formatRub(version.totalAmount)}</p>
        </div>
      </div>

      {/* Предупреждение для базовой версии */}
      {version.isBaseline && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Базовая версия доступна только для просмотра — редактирование запрещено.
          </AlertDescription>
        </Alert>
      )}

      {/* Строка управления */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по позициям..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        {!version.isBaseline && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddingChapter(true)}
            disabled={addChapter.isPending}
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Добавить раздел
          </Button>
        )}
      </div>

      {/* Инлайн-форма добавления раздела */}
      {addingChapter && (
        <div className="flex items-center gap-2 rounded-md border p-2">
          <Input
            autoFocus
            placeholder="Название раздела..."
            value={newChapterName}
            onChange={(e) => setNewChapterName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAddChapter();
              if (e.key === 'Escape') { setAddingChapter(false); setNewChapterName(''); }
            }}
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={() => void handleAddChapter()} disabled={addChapter.isPending}>
            Добавить
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setAddingChapter(false); setNewChapterName(''); }}>
            Отмена
          </Button>
        </div>
      )}

      {/* Дерево разделов */}
      {topChapters.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground border rounded-md">
          Нет разделов. Добавьте раздел, чтобы начать заполнять смету.
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          {topChapters.map((chapter) => (
            <EstimateChapterSection
              key={chapter.id}
              chapter={chapter}
              projectId={objectId}
              contractId={contractId}
              versionId={versionId}
              readOnly={version.isBaseline}
              search={search}
            />
          ))}
        </div>
      )}

      {/* Итого */}
      <div className="flex justify-end gap-6 border-t pt-3 text-sm font-medium">
        <span className="text-muted-foreground">Труд:</span>
        <span className="tabular-nums">{formatRub(version.totalLabor)}</span>
        <span className="text-muted-foreground">Материалы:</span>
        <span className="tabular-nums">{formatRub(version.totalMat)}</span>
        <span className="text-muted-foreground font-semibold">Итого:</span>
        <span className="tabular-nums font-bold">{formatRub(version.totalAmount)}</span>
      </div>
    </div>
  );
}
