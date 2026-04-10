'use client';

import { useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2 } from 'lucide-react';
import { useLandPlots, type LandPlot } from './useLandPlots';
import { AddLandPlotDialog } from './AddLandPlotDialog';

interface Props {
  plot: LandPlot | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
}

/** Строка детальной информации об участке */
function InfoRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  const displayValue = typeof value === 'boolean' ? (value ? 'Да' : 'Нет') : String(value);
  return (
    <div className="grid grid-cols-2 gap-2 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words">{displayValue}</span>
    </div>
  );
}

export function LandPlotCard({ plot, open, onOpenChange, projectId }: Props) {
  const { deleteMutation } = useLandPlots(projectId);
  const [editOpen, setEditOpen] = useState(false);

  if (!plot) return null;

  const handleDelete = () => {
    deleteMutation.mutate(plot.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const formatNumber = (v: number | null | undefined) =>
    v != null ? v.toLocaleString('ru-RU') : null;

  const formatDate = (v: string | null | undefined) => {
    if (!v) return null;
    try { return new Date(v).toLocaleDateString('ru-RU'); } catch { return v; }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base font-semibold break-words">
              {plot.cadastralNumber}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-0 mb-6">
            <InfoRow label="Кадастровый номер" value={plot.cadastralNumber} />
            <InfoRow label="Адрес" value={plot.address} />
            <InfoRow label="Правообладатель" value={plot.ownerOrg?.name} />
            <InfoRow label="Арендатор" value={plot.tenantOrg?.name} />
            <InfoRow label="Статус" value={plot.status} />
            <InfoRow label="Форма собственности" value={plot.ownershipForm} />
            <InfoRow label="Площадь, кв.м." value={formatNumber(plot.area)} />
            <InfoRow label="Категория земель" value={plot.landCategory} />
            <InfoRow label="Вид разрешённого использования" value={plot.permittedUse} />
            <InfoRow label="Кадастровая стоимость, руб." value={formatNumber(plot.cadastralValue)} />
            <InfoRow label="Обременения" value={plot.hasEncumbrances ? 'Да' : null} />
            {plot.hasEncumbrances && <InfoRow label="Описание обременений" value={plot.encumbranceInfo} />}
            <InfoRow label="Ограничения" value={plot.hasRestrictions ? 'Да' : null} />
            {plot.hasRestrictions && <InfoRow label="Описание ограничений" value={plot.restrictionInfo} />}
            <InfoRow label="Объекты под снос" value={plot.hasDemolitionObjects ? 'Да' : null} />
            {plot.hasDemolitionObjects && <InfoRow label="Описание объектов под снос" value={plot.demolitionInfo} />}
            <InfoRow label="Дата осмотра" value={formatDate(plot.inspectionDate)} />
            <InfoRow label="Номер ЕГРН" value={plot.egrnNumber} />
            <InfoRow label="ГПЗУ номер" value={plot.gpzuNumber} />
            <InfoRow label="ГПЗУ дата" value={formatDate(plot.gpzuDate)} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="flex-1"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить участок?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Земельный участок {plot.cadastralNumber} будет удалён безвозвратно.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SheetContent>
      </Sheet>

      <AddLandPlotDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        initialValues={plot}
      />
    </>
  );
}
