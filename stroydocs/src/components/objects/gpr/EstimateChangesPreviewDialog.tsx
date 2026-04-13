'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download } from 'lucide-react';
import { useEstimateChangesPreview } from './useEstimateChangesPreview';
import type { EstimateChangePreviewItem } from '@/lib/gantt/estimate-changes-preview';

interface Props {
  objectId: string;
  versionId: string;
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  WILL_DELETE: 'Будет удалена',
  WILL_CHANGE: 'Будет изменена',
  WILL_ADD: 'Будет добавлена',
};

const TYPE_LABEL: Record<string, string> = {
  ESTIMATE: 'Смета',
  SECTION: 'Раздел',
  ITEM: 'Позиция',
};

/** Цвет фона строки по статусу изменения */
function rowClassName(status: string): string {
  switch (status) {
    case 'WILL_DELETE': return 'bg-red-50 text-red-900';
    case 'WILL_ADD': return 'bg-green-50 text-green-900';
    case 'WILL_CHANGE': return 'bg-amber-50 text-amber-900';
    default: return '';
  }
}

function fmtNum(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

/** Ячейка с текущим/новым значением для WILL_CHANGE */
function DeltaCell({ current, next }: { current?: number | null; next?: number | null }) {
  if (current == null && next == null) return <span>—</span>;
  if (current === next) return <span>{fmtNum(next)}</span>;
  return (
    <span>
      <span className="line-through text-muted-foreground mr-1">{fmtNum(current)}</span>
      <span className="font-medium">{fmtNum(next)}</span>
    </span>
  );
}

function PreviewRow({ item }: { item: EstimateChangePreviewItem }) {
  const isBold = item.type === 'ESTIMATE' || item.type === 'SECTION';
  const d = item.status === 'WILL_DELETE' ? item.currentData : item.newData;
  const isChange = item.status === 'WILL_CHANGE' && item.currentData && item.newData;

  return (
    <TableRow className={rowClassName(item.status)}>
      <TableCell className={isBold ? 'font-bold' : ''}>{TYPE_LABEL[item.type]}</TableCell>
      <TableCell className={isBold ? 'font-bold' : ''}>{item.name}</TableCell>
      <TableCell>{d?.unit ?? '—'}</TableCell>
      <TableCell className="text-right">
        {isChange ? <DeltaCell current={item.currentData?.volume} next={item.newData?.volume} /> : fmtNum(d?.volume)}
      </TableCell>
      <TableCell className="text-right">
        {isChange ? <DeltaCell current={item.currentData?.amount} next={item.newData?.amount} /> : fmtNum(d?.amount)}
      </TableCell>
      <TableCell>{STATUS_LABEL[item.status]}</TableCell>
    </TableRow>
  );
}

export function EstimateChangesPreviewDialog({ objectId, versionId, onClose }: Props) {
  const h = useEstimateChangesPreview(objectId, versionId);
  const hasPreview = !!h.previewData;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={hasPreview ? 'max-w-4xl max-h-[90vh] overflow-y-auto' : 'max-w-md'}>
        <DialogHeader>
          <DialogTitle>{hasPreview ? 'Предпросмотр изменений сметы' : 'Обновить из сметы'}</DialogTitle>
        </DialogHeader>

        {!hasPreview ? (
          <form onSubmit={(e) => { e.preventDefault(); h.fetchPreview(); }}>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Договор</Label>
                <Select value={h.contractId} onValueChange={h.setContractId} disabled={h.contractsLoading}>
                  <SelectTrigger><SelectValue placeholder="Выберите договор..." /></SelectTrigger>
                  <SelectContent>
                    {h.contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.number} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Версия сметы</Label>
                <Select value={h.estimateVersionId} onValueChange={h.setEstimateVersionId} disabled={!h.contractId || h.versionsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={!h.contractId ? 'Сначала выберите договор' : h.versionsLoading ? 'Загрузка...' : 'Выберите версию сметы...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {h.estimateVersions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name} ({v._count.chapters} разделов)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
              <Button type="submit" disabled={!h.estimateVersionId || h.isPreviewLoading}>
                {h.isPreviewLoading ? 'Загрузка...' : 'Показать изменения'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <PreviewContent h={h} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Контент предпросмотра (отдельный компонент для TS-narrowing) */
function PreviewContent({ h, onClose }: { h: ReturnType<typeof useEstimateChangesPreview>; onClose: () => void }) {
  const pd = h.previewData!;
  return (
    <>
      {pd.items.length === 0 ? (
        <p className="py-4 text-center text-muted-foreground">Изменений нет — структура сметы не отличается.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Добавлено: {pd.summary.willAdd}, Изменено: {pd.summary.willChange}, Удалено: {pd.summary.willDelete}
          </p>
          <div className="max-h-[60vh] overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Тип</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead className="w-20">Ед.</TableHead>
                  <TableHead className="w-32 text-right">Объём</TableHead>
                  <TableHead className="w-36 text-right">Стоимость</TableHead>
                  <TableHead className="w-36">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pd.items.map((item, idx) => (
                  <PreviewRow key={item.ganttTaskId ?? item.estimateItemId ?? idx} item={item} />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={h.resetPreview}>Назад</Button>
        <Button type="button" variant="outline" onClick={() => h.exportToExcel(pd.items)} disabled={pd.items.length === 0}>
          <Download className="h-4 w-4 mr-1" />Экспорт в Excel
        </Button>
        <Button
          type="button"
          disabled={pd.items.length === 0 || h.isApplying}
          onClick={() => h.applyChanges(undefined, { onSuccess: onClose })}
        >
          {h.isApplying ? 'Применение...' : 'Применить'}
        </Button>
      </DialogFooter>
    </>
  );
}
