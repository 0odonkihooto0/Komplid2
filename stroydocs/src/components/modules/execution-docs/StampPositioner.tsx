'use client';

import dynamic from 'next/dynamic';
import { Stamp, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStampPositioner } from './useStampPositioner';
import type { StampType } from './useStampPositioner';

// react-pdf не совместим с SSR
const PdfViewer = dynamic(
  () => import('@/components/shared/PdfViewer').then((m) => ({ default: m.PdfViewer })),
  { ssr: false },
);

interface StampPositionerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId: string;
  docId: string;
  docNumber?: string;
  pdfUrl: string;
}

const STAMP_TYPE_LABELS: Record<StampType, string> = {
  work_permit: 'Разрешение на производство работ',
  certified_copy: 'Копия верна',
};

export function StampPositioner({
  open,
  onOpenChange,
  projectId,
  contractId,
  docId,
  docNumber,
  pdfUrl,
}: StampPositionerProps) {
  const {
    stampType,
    setStampType,
    position,
    handlePageClick,
    responsibleName,
    setResponsibleName,
    certifiedByName,
    setCertifiedByName,
    certifiedByPos,
    setCertifiedByPos,
    stampMutation,
    canApply,
    reset,
  } = useStampPositioner({
    projectId,
    contractId,
    docId,
    docNumber,
    onSuccess: () => onOpenChange(false),
  });

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stamp className="h-5 w-5 text-primary" />
            Наложить штамп на PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Выбор типа штампа */}
          <div className="space-y-1.5">
            <Label>Тип штампа</Label>
            <Select value={stampType} onValueChange={(v) => setStampType(v as StampType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work_permit">{STAMP_TYPE_LABELS.work_permit}</SelectItem>
                <SelectItem value="certified_copy">{STAMP_TYPE_LABELS.certified_copy}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PDF-просмотрщик — клик для выбора позиции */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Кликните на PDF для выбора позиции штампа
            </Label>
            <div className="cursor-crosshair">
              <PdfViewer url={pdfUrl} onPageClick={handlePageClick} />
            </div>
          </div>

          {/* Индикатор позиции */}
          {position ? (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <MapPin className="h-4 w-4" />
              Позиция выбрана: стр. {position.page}, X: {(position.x * 100).toFixed(0)}%,
              Y: {(position.y * 100).toFixed(0)}%
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Кликните по нужному месту на PDF выше
            </p>
          )}

          {/* Поля данных штампа в зависимости от типа */}
          {stampType === 'work_permit' && (
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="responsibleName">ФИО ответственного</Label>
                <Input
                  id="responsibleName"
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  placeholder="Иванов И.И."
                />
              </div>
            </div>
          )}

          {stampType === 'certified_copy' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="certifiedByPos">Должность</Label>
                <Input
                  id="certifiedByPos"
                  value={certifiedByPos}
                  onChange={(e) => setCertifiedByPos(e.target.value)}
                  placeholder="Начальник участка"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="certifiedByName">ФИО заверяющего</Label>
                <Input
                  id="certifiedByName"
                  value={certifiedByName}
                  onChange={(e) => setCertifiedByName(e.target.value)}
                  placeholder="Петров П.П."
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Отмена
          </Button>
          <Button
            onClick={() => stampMutation.mutate()}
            disabled={!canApply || stampMutation.isPending}
          >
            <Stamp className="mr-2 h-4 w-4" />
            {stampMutation.isPending ? 'Наложение...' : 'Наложить штамп'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
