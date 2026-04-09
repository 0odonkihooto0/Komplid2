'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Download, Plus, Minus, RefreshCw, Minus as Equal } from 'lucide-react';
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
import type { BimModelDiff, BimElementSummary, ModifiedElement } from '@/lib/bim/compare-models';

interface Props {
  modelAName: string;
  modelBName: string;
  diff: BimModelDiff;
}

export function VersionDiffViewer({ modelAName, modelBName, diff }: Props) {
  const [activeTab, setActiveTab] = useState('added');
  const { stats } = diff;

  async function handleExport() {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();

    // Лист «Добавлено»
    addSheet(wb, 'Добавлено', diff.added, modelBName);
    // Лист «Удалено»
    addSheet(wb, 'Удалено', diff.removed, modelAName);
    // Лист «Изменено»
    addModifiedSheet(wb, diff.modified);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diff_${modelAName}_vs_${modelBName}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Сводка изменений */}
      <div className="flex flex-wrap items-center gap-2">
        <SummaryBadge
          icon={<Plus className="h-3 w-3" />}
          count={stats.addedCount}
          label="добавлено"
          variant="added"
        />
        <SummaryBadge
          icon={<Minus className="h-3 w-3" />}
          count={stats.removedCount}
          label="удалено"
          variant="removed"
        />
        <SummaryBadge
          icon={<RefreshCw className="h-3 w-3" />}
          count={stats.modifiedCount}
          label="изменено"
          variant="modified"
        />
        <SummaryBadge
          icon={<Equal className="h-3 w-3" />}
          count={stats.unchangedCount}
          label="без изменений"
          variant="unchanged"
        />
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Экспорт xlsx
          </Button>
        </div>
      </div>

      {/* Таблицы по категориям */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="added">
            Добавлено{' '}
            {stats.addedCount > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {stats.addedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="removed">
            Удалено{' '}
            {stats.removedCount > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {stats.removedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="modified">
            Изменено{' '}
            {stats.modifiedCount > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {stats.modifiedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="added">
          <ElementTable elements={diff.added} emptyText="Нет добавленных элементов" />
        </TabsContent>

        <TabsContent value="removed">
          <ElementTable elements={diff.removed} emptyText="Нет удалённых элементов" />
        </TabsContent>

        <TabsContent value="modified">
          <ModifiedTable elements={diff.modified} />
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
  variant: 'added' | 'removed' | 'modified' | 'unchanged';
}

const variantClasses: Record<SummaryBadgeProps['variant'], string> = {
  added: 'bg-green-100 text-green-800 border-green-200',
  removed: 'bg-red-100 text-red-800 border-red-200',
  modified: 'bg-orange-100 text-orange-800 border-orange-200',
  unchanged: 'bg-gray-100 text-gray-600 border-gray-200',
};

function SummaryBadge({ icon, count, label, variant }: SummaryBadgeProps) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${variantClasses[variant]}`}
    >
      {icon}
      <span className="font-semibold">{count}</span>
      <span>{label}</span>
    </div>
  );
}

function ElementTable({ elements, emptyText }: { elements: BimElementSummary[]; emptyText: string }) {
  if (elements.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48">IFC GUID</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Наименование</TableHead>
            <TableHead>Слой</TableHead>
            <TableHead>Уровень</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {elements.map((el) => (
            <TableRow key={el.id}>
              <TableCell className="font-mono text-xs">{el.ifcGuid}</TableCell>
              <TableCell className="text-xs">{el.ifcType}</TableCell>
              <TableCell className="text-xs">{el.name ?? '—'}</TableCell>
              <TableCell className="text-xs">{el.layer ?? '—'}</TableCell>
              <TableCell className="text-xs">{el.level ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ModifiedTable({ elements }: { elements: ModifiedElement[] }) {
  if (elements.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Нет изменённых элементов</p>;
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48">IFC GUID</TableHead>
            <TableHead>Тип (было → стало)</TableHead>
            <TableHead>Наименование (было → стало)</TableHead>
            <TableHead>Изменены поля</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {elements.map(({ elementA, elementB, changes }) => (
            <TableRow key={elementA.id}>
              <TableCell className="font-mono text-xs">{elementA.ifcGuid}</TableCell>
              <TableCell className="text-xs">
                {changes.includes('ifcType') ? (
                  <span>
                    <span className="text-red-600 line-through">{elementA.ifcType}</span>
                    {' → '}
                    <span className="text-green-600">{elementB.ifcType}</span>
                  </span>
                ) : (
                  elementA.ifcType
                )}
              </TableCell>
              <TableCell className="text-xs">
                {changes.includes('name') ? (
                  <span>
                    <span className="text-red-600 line-through">{elementA.name ?? '—'}</span>
                    {' → '}
                    <span className="text-green-600">{elementB.name ?? '—'}</span>
                  </span>
                ) : (
                  (elementA.name ?? '—')
                )}
              </TableCell>
              <TableCell className="text-xs">{changes.join(', ')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── xlsx хелперы ───────────────────────────────────────────────────────────

function addSheet(
  wb: import('exceljs').Workbook,
  name: string,
  elements: BimElementSummary[],
  _modelName: string
) {
  const ws = wb.addWorksheet(name);
  ws.columns = [
    { header: 'IFC GUID', key: 'ifcGuid', width: 28 },
    { header: 'Тип IFC', key: 'ifcType', width: 20 },
    { header: 'Наименование', key: 'elName', width: 30 },
    { header: 'Слой', key: 'layer', width: 20 },
    { header: 'Уровень', key: 'level', width: 15 },
  ];
  for (const el of elements) {
    ws.addRow({ ifcGuid: el.ifcGuid, ifcType: el.ifcType, elName: el.name ?? '', layer: el.layer ?? '', level: el.level ?? '' });
  }
}

function addModifiedSheet(
  wb: import('exceljs').Workbook,
  elements: ModifiedElement[]
) {
  const ws = wb.addWorksheet('Изменено');
  ws.columns = [
    { header: 'IFC GUID', key: 'ifcGuid', width: 28 },
    { header: 'Тип (было)', key: 'typeA', width: 20 },
    { header: 'Тип (стало)', key: 'typeB', width: 20 },
    { header: 'Наименование (было)', key: 'nameA', width: 30 },
    { header: 'Наименование (стало)', key: 'nameB', width: 30 },
    { header: 'Изменены поля', key: 'changes', width: 30 },
  ];
  for (const { elementA, elementB, changes } of elements) {
    ws.addRow({
      ifcGuid: elementA.ifcGuid,
      typeA: elementA.ifcType,
      typeB: elementB.ifcType,
      nameA: elementA.name ?? '',
      nameB: elementB.name ?? '',
      changes: changes.join(', '),
    });
  }
}
