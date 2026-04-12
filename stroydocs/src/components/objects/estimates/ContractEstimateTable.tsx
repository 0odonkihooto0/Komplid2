'use client';

import { ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ContractSection, ContractItem } from '@/hooks/useEstimateContract';

// ─── Форматирование ──────────────────────────────────────────────────────────

const fmtNum = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v);

const fmtRub = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);

// ─── Колонки ─────────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'number', label: '№ п.п', width: 'w-[50px]' },
  { id: 'estimateNo', label: 'Номер сметы', width: 'w-[100px]' },
  { id: 'basis', label: 'Обоснование', width: 'w-[120px]' },
  { id: 'name', label: 'Наименование конструктивных решений', width: 'flex-1' },
  { id: 'unit', label: 'Ед. изм.', width: 'w-[70px]' },
  { id: 'quantity', label: 'Кол-во', width: 'w-[80px]' },
  { id: 'unitPrice', label: 'Цена за ед. без НДС', width: 'w-[120px]' },
  { id: 'totalPrice', label: 'Стоимость всего', width: 'w-[120px]' },
  { id: 'sr', label: 'СР', width: 'w-[90px]' },
  { id: 'actions', label: '', width: 'w-[36px]' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

export type RowAction = 'selectEstimate' | 'addItem' | 'edit';

interface Props {
  sections: ContractSection[];
  expandedSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  onRowAction: (action: RowAction, itemId: string) => void;
}

/** Иерархическая таблица сметы контракта */
export function ContractEstimateTable({ sections, expandedSections, onToggleSection, onRowAction }: Props) {
  if (sections.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground border rounded-md">
        Нет разделов. Добавьте раздел или привяжите расчёты из локальных смет.
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-x-auto">
      {/* Шапка */}
      <div className="flex items-center text-xs text-muted-foreground font-medium border-b bg-muted/30 px-2 py-1.5 min-w-[900px]">
        {COLUMNS.map((col) => (
          <span key={col.id} className={`px-1 ${col.width} ${col.id === 'quantity' || col.id === 'unitPrice' || col.id === 'totalPrice' || col.id === 'sr' ? 'text-right' : ''}`}>
            {col.label}
          </span>
        ))}
      </div>

      {/* Строки */}
      {sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          isExpanded={expandedSections.has(section.id)}
          onToggle={() => onToggleSection(section.id)}
          onRowAction={onRowAction}
        />
      ))}
    </div>
  );
}

// ─── Блок раздела ────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  isExpanded,
  onToggle,
  onRowAction,
}: {
  section: ContractSection;
  isExpanded: boolean;
  onToggle: () => void;
  onRowAction: (action: RowAction, itemId: string) => void;
}) {
  return (
    <>
      {/* Строка раздела */}
      <div
        className="flex items-center border-b bg-muted/20 hover:bg-muted/40 cursor-pointer min-w-[900px] px-2 py-2"
        onClick={onToggle}
      >
        <span className="w-[50px] px-1">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <span className="w-[100px] px-1 text-sm text-muted-foreground">{section.code ?? ''}</span>
        <span className="w-[120px] px-1" />
        <span className="flex-1 px-1 font-semibold text-sm">{section.name}</span>
        <span className="w-[70px] px-1" />
        <span className="w-[80px] px-1" />
        <span className="w-[120px] px-1" />
        <span className="w-[120px] px-1 text-right text-sm font-medium tabular-nums">{fmtRub(section.totalAmount)}</span>
        <span className="w-[90px] px-1" />
        <span className="w-[36px] px-1" />
      </div>

      {/* Позиции (видны при раскрытом разделе) */}
      {isExpanded && section.items.map((item) => (
        <ItemRow key={item.id} item={item} onRowAction={onRowAction} />
      ))}
    </>
  );
}

// ─── Строка позиции ──────────────────────────────────────────────────────────

function ItemRow({ item, onRowAction }: { item: ContractItem; onRowAction: (action: RowAction, id: string) => void }) {
  return (
    <div className="flex items-center border-b last:border-0 hover:bg-muted/10 min-w-[900px] px-2 py-1.5">
      <span className="w-[50px] px-1 text-sm text-muted-foreground pl-6">{item.sortOrder ?? ''}</span>
      <span className="w-[100px] px-1 text-sm text-muted-foreground">{item.versionName}</span>
      <span className="w-[120px] px-1 text-sm">{item.code ?? '—'}</span>
      <span className="flex-1 px-1 text-sm truncate">{item.name}</span>
      <span className="w-[70px] px-1 text-sm text-muted-foreground">{item.unit ?? '—'}</span>
      <span className="w-[80px] px-1 text-sm text-right tabular-nums">{fmtNum(item.volume)}</span>
      <span className="w-[120px] px-1 text-sm text-right tabular-nums">{fmtRub(item.unitPrice)}</span>
      <span className="w-[120px] px-1 text-sm text-right tabular-nums">{fmtRub(item.totalPrice)}</span>
      <span className="w-[90px] px-1 text-sm text-right tabular-nums">{fmtRub(item.laborCost)}</span>
      <span className="w-[36px] px-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRowAction('selectEstimate', item.id)}>
              Выбрать расчет
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRowAction('addItem', item.id)}>
              Добавить позицию
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRowAction('edit', item.id)}>
              Редактировать
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </div>
  );
}
