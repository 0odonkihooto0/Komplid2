'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ClashResultItem } from './useCollisions';

interface Props {
  results: ClashResultItem[];
  /** Вызывается при нажатии «Выделить» — передаёт GUID пары */
  onHighlight: (guidA: string, guidB: string) => void;
}

export function CollisionResultsList({ results, onHighlight }: Props) {
  if (results.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Коллизии не обнаружены
      </p>
    );
  }

  const labelMap: Record<'intersection' | 'duplicate', string> = {
    intersection: 'Пересечение',
    duplicate: 'Дублирование',
  };

  async function handleExport() {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Коллизии');
    ws.columns = [
      { header: '№', key: 'n', width: 6 },
      { header: 'GUID A', key: 'guidA', width: 28 },
      { header: 'GUID B', key: 'guidB', width: 28 },
      { header: 'Тип', key: 'type', width: 18 },
      { header: 'X', key: 'cx', width: 12 },
      { header: 'Y', key: 'cy', width: 12 },
      { header: 'Z', key: 'cz', width: 12 },
    ];
    results.forEach((r, i) => {
      ws.addRow({
        n: i + 1,
        guidA: r.guidA,
        guidB: r.guidB,
        type: labelMap[r.type],
        cx: r.clashPoint?.[0]?.toFixed(3) ?? '—',
        cy: r.clashPoint?.[1]?.toFixed(3) ?? '—',
        cz: r.clashPoint?.[2]?.toFixed(3) ?? '—',
      });
    });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'collisions.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Найдено:{' '}
          <Badge variant="destructive" className="ml-1">
            {results.length}
          </Badge>
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-3.5 w-3.5" />
          xlsx
        </Button>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">№</TableHead>
              <TableHead>GUID A</TableHead>
              <TableHead>GUID B</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r, i) => (
              <TableRow key={`${r.guidA}-${r.guidB}`}>
                <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-mono text-xs">{r.guidA.slice(0, 14)}…</TableCell>
                <TableCell className="font-mono text-xs">{r.guidB.slice(0, 14)}…</TableCell>
                <TableCell>
                  <Badge
                    variant={r.type === 'intersection' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {labelMap[r.type]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => onHighlight(r.guidA, r.guidB)}
                  >
                    Выделить
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
