'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Download, Plus, Minus, RefreshCw, Hexagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { IfcDiffResult, IfcDiffElement, IfcDiffChangedElement } from '@/types/bim-diff';

interface Props {
  diff: IfcDiffResult;
  onHighlight?: (guid: string) => void;
}

// ─── Цветовая палитра по ЦУС стр. 303–304 ──────────────────────────────────
const COLORS = {
  added: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', hex: '#22C55E' },
  deleted: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', hex: '#EF4444' },
  changed: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', hex: '#F59E0B' },
  geometry: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', hex: '#F97316' },
};

export function VersionDiffViewer({ diff, onHighlight }: Props) {
  const [activeTab, setActiveTab] = useState('added');
  const [highlightedGuid, setHighlightedGuid] = useState<string | null>(null);

  const counts = {
    added: diff.added.length,
    deleted: diff.deleted.length,
    changed: diff.changed.length,
    geometry: diff.geometryChanged.length,
  };

  function handleRowClick(guid: string) {
    setHighlightedGuid(guid);
    onHighlight?.(guid);
  }

  async function handleExport() {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();

    // Общие колонки для всех листов
    const cols = [
      { header: 'GUID', key: 'guid', width: 28 },
      { header: 'Тип IFC', key: 'ifcType', width: 22 },
      { header: 'Наименование', key: 'name', width: 32 },
      { header: 'Статус изменения', key: 'status', width: 22 },
      { header: 'Изменённые атрибуты', key: 'attrs', width: 35 },
    ];

    const addSheet = (sheetName: string, status: string, rows: IfcDiffElement[]) => {
      const ws = wb.addWorksheet(sheetName);
      ws.columns = cols;
      for (const el of rows) {
        ws.addRow({ guid: el.guid, ifcType: el.ifcType ?? '', name: el.name ?? '', status, attrs: '' });
      }
    };

    addSheet('Добавлено', 'Добавлено', diff.added);
    addSheet('Удалено', 'Удалено', diff.deleted);

    const wsChanged = wb.addWorksheet('Изм.Атрибуты');
    wsChanged.columns = cols;
    for (const el of diff.changed) {
      wsChanged.addRow({
        guid: el.guid,
        ifcType: el.ifcType ?? '',
        name: el.name ?? '',
        status: 'Изм. атрибуты',
        attrs: el.changedAttributes.join(', '),
      });
    }

    addSheet('Изм.Геометрия', 'Изм. геометрия', diff.geometryChanged);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff_report.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Сводная строка с цветовыми бейджами */}
      <div className="flex flex-wrap items-center gap-2">
        <SummaryBadge icon={<Plus className="h-3 w-3" />} count={counts.added} label="добавлено" color={COLORS.added} />
        <SummaryBadge icon={<Minus className="h-3 w-3" />} count={counts.deleted} label="удалено" color={COLORS.deleted} />
        <SummaryBadge icon={<RefreshCw className="h-3 w-3" />} count={counts.changed} label="атрибуты" color={COLORS.changed} />
        <SummaryBadge icon={<Hexagon className="h-3 w-3" />} count={counts.geometry} label="геометрия" color={COLORS.geometry} />
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Скачать отчёт .xlsx
          </Button>
        </div>
      </div>

      {/* Вкладки по категориям */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="added" className="text-xs">
            <span className="mr-1 h-2 w-2 rounded-full bg-green-500 inline-block" />
            Добавлено{counts.added > 0 && <Badge variant="secondary" className="ml-1">{counts.added}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="deleted" className="text-xs">
            <span className="mr-1 h-2 w-2 rounded-full bg-red-500 inline-block" />
            Удалено{counts.deleted > 0 && <Badge variant="secondary" className="ml-1">{counts.deleted}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="changed" className="text-xs">
            <span className="mr-1 h-2 w-2 rounded-full bg-yellow-500 inline-block" />
            Атрибуты{counts.changed > 0 && <Badge variant="secondary" className="ml-1">{counts.changed}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="geometry" className="text-xs">
            <span className="mr-1 h-2 w-2 rounded-full bg-orange-500 inline-block" />
            Геометрия{counts.geometry > 0 && <Badge variant="secondary" className="ml-1">{counts.geometry}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="added">
          <DiffElementTable
            elements={diff.added}
            emptyText="Нет добавленных элементов"
            highlightedGuid={highlightedGuid}
            onRowClick={handleRowClick}
            rowColor="#22C55E"
          />
        </TabsContent>

        <TabsContent value="deleted">
          <DiffElementTable
            elements={diff.deleted}
            emptyText="Нет удалённых элементов"
            highlightedGuid={highlightedGuid}
            onRowClick={handleRowClick}
            rowColor="#EF4444"
          />
        </TabsContent>

        <TabsContent value="changed">
          <ChangedAttributesTable
            elements={diff.changed}
            highlightedGuid={highlightedGuid}
            onRowClick={handleRowClick}
          />
        </TabsContent>

        <TabsContent value="geometry">
          <DiffElementTable
            elements={diff.geometryChanged}
            emptyText="Нет элементов с изменённой геометрией"
            highlightedGuid={highlightedGuid}
            onRowClick={handleRowClick}
            rowColor="#F97316"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Внутренние компоненты ───────────────────────────────────────────────────

interface SummaryBadgeProps {
  icon: ReactNode;
  count: number;
  label: string;
  color: { bg: string; text: string; border: string };
}

function SummaryBadge({ icon, count, label, color }: SummaryBadgeProps) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${color.bg} ${color.text} ${color.border}`}
    >
      {icon}
      <span className="font-semibold">{count}</span>
      <span>{label}</span>
    </div>
  );
}

interface DiffElementTableProps {
  elements: IfcDiffElement[];
  emptyText: string;
  highlightedGuid: string | null;
  onRowClick: (guid: string) => void;
  rowColor: string;
}

function DiffElementTable({ elements, emptyText, highlightedGuid, onRowClick, rowColor }: DiffElementTableProps) {
  if (elements.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-44">GUID</TableHead>
            <TableHead>Тип IFC</TableHead>
            <TableHead>Наименование</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {elements.map((el) => (
            <TableRow
              key={el.guid}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              style={highlightedGuid === el.guid ? { borderLeft: `3px solid ${rowColor}`, background: `${rowColor}18` } : {}}
              onClick={() => onRowClick(el.guid)}
            >
              <TableCell className="font-mono text-xs">{el.guid}</TableCell>
              <TableCell className="text-xs">{el.ifcType ?? '—'}</TableCell>
              <TableCell className="text-xs">{el.name ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface ChangedAttributesTableProps {
  elements: IfcDiffChangedElement[];
  highlightedGuid: string | null;
  onRowClick: (guid: string) => void;
}

function ChangedAttributesTable({ elements, highlightedGuid, onRowClick }: ChangedAttributesTableProps) {
  if (elements.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Нет элементов с изменёнными атрибутами</p>;
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-44">GUID</TableHead>
            <TableHead>Тип IFC</TableHead>
            <TableHead>Наименование</TableHead>
            <TableHead>Изменённые атрибуты</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {elements.map((el) => (
            <TableRow
              key={el.guid}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              style={highlightedGuid === el.guid ? { borderLeft: '3px solid #F59E0B', background: '#F59E0B18' } : {}}
              onClick={() => onRowClick(el.guid)}
            >
              <TableCell className="font-mono text-xs">{el.guid}</TableCell>
              <TableCell className="text-xs">{el.ifcType ?? '—'}</TableCell>
              <TableCell className="text-xs">{el.name ?? '—'}</TableCell>
              <TableCell className="text-xs">{el.changedAttributes.join(', ')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
