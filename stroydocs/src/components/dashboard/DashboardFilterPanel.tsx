'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface DashboardFilters {
  objectIds: string[];
  statuses: string[];
  regions: string[];
  constructionTypes: string[];
}

export interface ProjectForFilter {
  id: string;
  name: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  region: string | null;
  constructionType: string | null;
}

interface DashboardFilterPanelProps {
  projects: ProjectForFilter[];
  onFiltersChange: (filters: DashboardFilters) => void;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ACTIVE', label: 'В работе' },
  { value: 'COMPLETED', label: 'Завершён' },
  { value: 'ARCHIVED', label: 'Архив' },
];

// Вспомогательный компонент секции фильтра
interface FilterSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
  children: React.ReactNode;
}

function FilterSection({ title, expanded, onToggle, searchValue, onSearchChange, children }: FilterSectionProps) {
  return (
    <div className="border-b pb-3 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors"
      >
        {title}
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="space-y-2">
          <Input
            placeholder="Поиск..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-7 text-xs"
          />
          <ScrollArea className="max-h-40">
            <div className="space-y-1 pr-2">
              {children}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// Вспомогательный компонент строки чекбокса
interface CheckRowProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function CheckRow({ id, label, checked, onCheckedChange }: CheckRowProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <span className="truncate">{label}</span>
    </label>
  );
}

export function DashboardFilterPanel({ projects, onFiltersChange, onClose }: DashboardFilterPanelProps) {
  const [expanded, setExpanded] = useState({ projects: true, statuses: true, regions: false, types: false });
  const [search, setSearch] = useState({ projects: '', statuses: '', regions: '', types: '' });
  const [selected, setSelected] = useState<DashboardFilters>({
    objectIds: [],
    statuses: [],
    regions: [],
    constructionTypes: [],
  });

  // Уникальные регионы и типы из данных
  const allRegions = Array.from(new Set(
    projects.map((p) => p.region).filter((r): r is string => Boolean(r))
  ));
  const allTypes = Array.from(new Set(
    projects.map((p) => p.constructionType).filter((t): t is string => Boolean(t))
  ));

  // Фильтрованные списки по поиску
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.projects.toLowerCase())
  );
  const filteredStatuses = STATUS_OPTIONS.filter((s) =>
    s.label.toLowerCase().includes(search.statuses.toLowerCase())
  );
  const filteredRegions = allRegions.filter((r) =>
    r.toLowerCase().includes(search.regions.toLowerCase())
  );
  const filteredTypes = allTypes.filter((t) =>
    t.toLowerCase().includes(search.types.toLowerCase())
  );

  // Уведомляем родителя при изменении фильтров
  useEffect(() => {
    onFiltersChange(selected);
  }, [selected, onFiltersChange]);

  const toggleValue = useCallback(
    (key: keyof DashboardFilters, value: string) => {
      setSelected((prev) => {
        const arr = prev[key];
        const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
        return { ...prev, [key]: next };
      });
    },
    []
  );

  const hasFilters =
    selected.objectIds.length + selected.statuses.length +
    selected.regions.length + selected.constructionTypes.length > 0;

  const handleReset = () =>
    setSelected({ objectIds: [], statuses: [], regions: [], constructionTypes: [] });

  return (
    <div className="w-[280px] shrink-0 border-l bg-background flex flex-col">
      {/* Заголовок */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">Фильтры</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} aria-label="Закрыть панель фильтров">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Тело панели */}
      <ScrollArea className="flex-1">
        <div className="space-y-0 px-4 py-3">
          {/* Проекты */}
          <FilterSection
            title="Проекты"
            expanded={expanded.projects}
            onToggle={() => setExpanded((e) => ({ ...e, projects: !e.projects }))}
            searchValue={search.projects}
            onSearchChange={(v) => setSearch((s) => ({ ...s, projects: v }))}
          >
            {filteredProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">Нет объектов</p>
            ) : (
              filteredProjects.map((p) => (
                <CheckRow
                  key={p.id}
                  id={`obj-${p.id}`}
                  label={p.name}
                  checked={selected.objectIds.includes(p.id)}
                  onCheckedChange={() => toggleValue('objectIds', p.id)}
                />
              ))
            )}
          </FilterSection>

          {/* Статус объектов */}
          <FilterSection
            title="Статус объектов"
            expanded={expanded.statuses}
            onToggle={() => setExpanded((e) => ({ ...e, statuses: !e.statuses }))}
            searchValue={search.statuses}
            onSearchChange={(v) => setSearch((s) => ({ ...s, statuses: v }))}
          >
            {filteredStatuses.map((s) => (
              <CheckRow
                key={s.value}
                id={`status-${s.value}`}
                label={s.label}
                checked={selected.statuses.includes(s.value)}
                onCheckedChange={() => toggleValue('statuses', s.value)}
              />
            ))}
          </FilterSection>

          {/* Регион — только если данные есть */}
          {allRegions.length > 0 && (
            <FilterSection
              title="Регион"
              expanded={expanded.regions}
              onToggle={() => setExpanded((e) => ({ ...e, regions: !e.regions }))}
              searchValue={search.regions}
              onSearchChange={(v) => setSearch((s) => ({ ...s, regions: v }))}
            >
              {filteredRegions.map((r) => (
                <CheckRow
                  key={r}
                  id={`region-${r}`}
                  label={r}
                  checked={selected.regions.includes(r)}
                  onCheckedChange={() => toggleValue('regions', r)}
                />
              ))}
            </FilterSection>
          )}

          {/* Тип объекта — только если данные есть */}
          {allTypes.length > 0 && (
            <FilterSection
              title="Тип объекта"
              expanded={expanded.types}
              onToggle={() => setExpanded((e) => ({ ...e, types: !e.types }))}
              searchValue={search.types}
              onSearchChange={(v) => setSearch((s) => ({ ...s, types: v }))}
            >
              {filteredTypes.map((t) => (
                <CheckRow
                  key={t}
                  id={`type-${t}`}
                  label={t}
                  checked={selected.constructionTypes.includes(t)}
                  onCheckedChange={() => toggleValue('constructionTypes', t)}
                />
              ))}
            </FilterSection>
          )}
        </div>
      </ScrollArea>

      {/* Кнопка сброса */}
      <div className="border-t px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!hasFilters}
          onClick={handleReset}
        >
          Сбросить фильтры
        </Button>
      </div>
    </div>
  );
}
