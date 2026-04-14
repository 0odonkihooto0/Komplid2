'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SlidersHorizontal, X } from 'lucide-react';
import {
  EXECUTION_DOC_TYPE_LABELS,
  EXECUTION_DOC_STATUS_LABELS,
  ID_CATEGORY_LABELS,
} from '@/utils/constants';
import type { ExecutionDocType, ExecutionDocStatus, IdCategory } from '@prisma/client';
import type { ExecutionDocsFilters } from './useExecutionDocs';

interface Props {
  filters: ExecutionDocsFilters;
}

const ALL_TYPES = Object.entries(EXECUTION_DOC_TYPE_LABELS) as [ExecutionDocType, string][];
const ALL_STATUSES = Object.entries(EXECUTION_DOC_STATUS_LABELS) as [ExecutionDocStatus, string][];
const ALL_ID_CATEGORIES = Object.entries(ID_CATEGORY_LABELS) as [IdCategory, string][];

export function ExecutionDocsFilterBar({ filters }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** Записываем фильтры в URL query params */
  const applyFilters = (f: ExecutionDocsFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    if (f.types && f.types.length > 0) params.set('filterTypes', f.types.join(','));
    else params.delete('filterTypes');
    if (f.statuses && f.statuses.length > 0) params.set('filterStatus', f.statuses.join(','));
    else params.delete('filterStatus');
    if (f.idCategory) params.set('filterIdCategory', f.idCategory);
    else params.delete('filterIdCategory');
    if (f.dateFrom) params.set('filterDateFrom', f.dateFrom);
    else params.delete('filterDateFrom');
    if (f.dateTo) params.set('filterDateTo', f.dateTo);
    else params.delete('filterDateTo');
    if (f.authorId) params.set('filterAuthorId', f.authorId);
    else params.delete('filterAuthorId');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Локальный черновик фильтров (применяются по кнопке)
  const [draft, setDraft] = useState<ExecutionDocsFilters>(filters);

  const toggleType = (t: ExecutionDocType) => {
    setDraft((prev) => {
      const types = prev.types ?? [];
      return {
        ...prev,
        types: types.includes(t) ? types.filter((x) => x !== t) : [...types, t],
      };
    });
  };

  const toggleStatus = (s: ExecutionDocStatus) => {
    setDraft((prev) => {
      const statuses = prev.statuses ?? [];
      return {
        ...prev,
        statuses: statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s],
      };
    });
  };

  const handleApply = () => {
    applyFilters(draft);
    setOpen(false);
  };

  const handleReset = () => {
    const empty: ExecutionDocsFilters = {};
    setDraft(empty);
    applyFilters(empty);
    setOpen(false);
  };

  // Подсчёт активных фильтров
  const activeCount =
    (filters.types?.length ?? 0) +
    (filters.statuses?.length ?? 0) +
    (filters.idCategory ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.authorId ? 1 : 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal className="h-4 w-4" />
          Фильтры
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          {/* Тип документа */}
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Тип</Label>
            <div className="mt-1.5 space-y-1">
              {ALL_TYPES.map(([value, label]) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={`ft-${value}`}
                    checked={draft.types?.includes(value) ?? false}
                    onCheckedChange={() => toggleType(value)}
                  />
                  <Label htmlFor={`ft-${value}`} className="text-sm font-normal">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Статус */}
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Статус</Label>
            <div className="mt-1.5 space-y-1">
              {ALL_STATUSES.map(([value, label]) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={`fs-${value}`}
                    checked={draft.statuses?.includes(value) ?? false}
                    onCheckedChange={() => toggleStatus(value)}
                  />
                  <Label htmlFor={`fs-${value}`} className="text-sm font-normal">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Группа ИД (idCategory) */}
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Группа ИД</Label>
            <Select
              value={draft.idCategory ?? 'ALL'}
              onValueChange={(v) => setDraft((p) => ({ ...p, idCategory: v === 'ALL' ? null : v as IdCategory }))}
            >
              <SelectTrigger className="mt-1.5 h-8 text-sm">
                <SelectValue placeholder="Все" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все</SelectItem>
                {ALL_ID_CATEGORIES.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Период (createdAt) */}
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Период создания</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                type="date"
                className="h-8 text-sm"
                value={draft.dateFrom ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, dateFrom: e.target.value || undefined }))}
              />
              <Input
                type="date"
                className="h-8 text-sm"
                value={draft.dateTo ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, dateTo: e.target.value || undefined }))}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
            <X className="h-3.5 w-3.5" /> Сбросить
          </Button>
          <Button size="sm" onClick={handleApply}>
            Применить
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
