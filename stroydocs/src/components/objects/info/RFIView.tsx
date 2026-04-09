'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, HelpCircle, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RFICard } from './RFICard';
import { CreateRFIDialog } from './CreateRFIDialog';
import { useRFIList } from './useRFIList';

type FilterTab = 'all' | 'OPEN' | 'IN_REVIEW' | 'ANSWERED' | 'overdue';

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all',       label: 'Все' },
  { value: 'OPEN',      label: 'Открытые' },
  { value: 'IN_REVIEW', label: 'На рассмотрении' },
  { value: 'ANSWERED',  label: 'Отвечено' },
  { value: 'overdue',   label: 'Просроченные' },
];

export function RFIView({ objectId }: { objectId: string }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const { items, isLoading, error, filterTab, setFilterTab, setSearch } = useRFIList(objectId);

  // Дебаунс 300мс перед отправкой поискового запроса
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput, setSearch]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" aria-label="Ошибка загрузки" />
        <p className="text-sm text-destructive">Не удалось загрузить вопросы (RFI)</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold shrink-0">Вопросы (RFI)</h2>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Поиск по вопросам..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Создать запрос
        </Button>
      </div>

      {/* Фильтры-таблетки */}
      <div className="flex rounded-md border overflow-hidden text-sm w-fit">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterTab(tab.value)}
            className={`px-3 py-1.5 transition-colors ${
              filterTab === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Скелетон */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Пустое состояние */}
      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <HelpCircle className="h-5 w-5 text-muted-foreground" aria-label="Нет вопросов" />
          </div>
          <p className="text-sm font-medium">Вопросов нет</p>
          <p className="text-xs text-muted-foreground mt-1">
            Создайте первый запрос на разъяснение, нажав «Создать запрос»
          </p>
        </div>
      )}

      {/* Сетка карточек */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((rfi) => (
            <RFICard
              key={rfi.id}
              rfi={rfi}
              onClick={() => router.push(`/objects/${objectId}/info/rfi/${rfi.id}`)}
            />
          ))}
        </div>
      )}

      <CreateRFIDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        objectId={objectId}
      />
    </div>
  );
}
