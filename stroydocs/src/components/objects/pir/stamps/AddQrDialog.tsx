'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { QrCode, MapPin, Check, Copy } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import { QR_TEMPLATE_LABELS } from './types';
import type { QrData, QrTemplate, QrStampPayload } from './types';

// react-pdf несовместим с SSR
const PdfViewer = dynamic(
  () => import('@/components/shared/PdfViewer').then((m) => m.PdfViewer),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-md bg-muted" /> },
);

interface AddQrDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  objectId: string;
  docId: string;
  s3Key: string;
  orgId: string;
  pdfUrl: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export function AddQrDialog({
  open,
  onOpenChange,
  objectId,
  docId,
  s3Key,
  pdfUrl,
}: AddQrDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [qrData, setQrData] = useState<QrData | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [position, setPosition] = useState<{ page: number; x: number; y: number } | null>(null);
  const [template, setTemplate] = useState<QrTemplate>('QR_ONLY');
  const [copied, setCopied] = useState(false);

  // Получение/генерация QR-токена (идемпотентно)
  const qrMutation = useMutation({
    mutationFn: async (): Promise<QrData> => {
      const res = await fetch(`/api/objects/${objectId}/design-docs/${docId}/qr`, { method: 'POST' });
      if (!res.ok) throw new Error('Ошибка получения QR-кода');
      const json: ApiResponse<QrData> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      return json.data;
    },
    onSuccess: (data) => setQrData(data),
    onError: (err: Error) => {
      toast({ title: 'Ошибка QR-кода', description: err.message, variant: 'destructive' });
    },
  });

  // Создание QR-штампа в БД
  const createStampMutation = useMutation({
    mutationFn: async () => {
      if (!position || !qrData) throw new Error('Выберите позицию на PDF');
      const payload: QrStampPayload = { type: 'QR', url: qrData.verifyUrl, template };
      const res = await fetch(`/api/projects/${objectId}/stamps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'DESIGN_DOC',
          entityId: docId,
          stampText: JSON.stringify(payload),
          s3Key,
          positionX: position.x,
          positionY: position.y,
          page: position.page - 1, // API принимает 0-based страницы
          width: 120,
          height: 120,
        }),
      });
      if (!res.ok) {
        const err: ApiResponse<null> = await res.json();
        throw new Error(err.error ?? 'Ошибка создания QR-штампа');
      }
    },
    onSuccess: () => {
      // Инвалидируем список штампов документа
      queryClient.invalidateQueries({ queryKey: ['stamps', objectId, docId] });
      toast({ title: 'QR-штамп добавлен' });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка создания QR-штампа', description: err.message, variant: 'destructive' });
    },
  });

  // При открытии — запрашиваем QR-токен и сбрасываем состояние
  useEffect(() => {
    if (open) {
      qrMutation.mutate();
      setPosition(null);
      setTemplate('QR_ONLY');
      setQrImageUrl(null);
    } else {
      setQrData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Генерация QR-изображения на клиенте при появлении verifyUrl
  useEffect(() => {
    if (!qrData?.verifyUrl) { setQrImageUrl(null); return; }
    let cancelled = false;
    import('qrcode').then((QR) => {
      QR.toDataURL(qrData.verifyUrl, { width: 120, margin: 1 }).then((url) => {
        if (!cancelled) setQrImageUrl(url);
      });
    });
    return () => { cancelled = true; };
  }, [qrData]);

  async function handleCopy() {
    if (!qrData?.verifyUrl) return;
    await navigator.clipboard.writeText(qrData.verifyUrl);
    setCopied(true);
    toast({ title: 'Ссылка скопирована' });
    setTimeout(() => setCopied(false), 2000);
  }

  const canSubmit = !!position && !!qrData && !createStampMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Добавить QR-штамп
          </DialogTitle>
          <DialogDescription className="sr-only">
            Выберите позицию QR-кода на странице PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Предпросмотр QR-кода и ссылка верификации */}
          <div className="flex items-start gap-4 rounded-md border p-3">
            <div className="shrink-0">
              {qrMutation.isPending || !qrImageUrl ? (
                <Skeleton className="h-[80px] w-[80px] rounded-md" />
              ) : (
                <img
                  src={qrImageUrl}
                  alt="QR-код верификации"
                  className="rounded-md border"
                  width={80}
                  height={80}
                />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Ссылка верификации</p>
              {qrData?.verifyUrl ? (
                <p className="break-all text-xs">{qrData.verifyUrl}</p>
              ) : (
                <Skeleton className="h-4 w-48" />
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-1 h-7 text-xs"
                onClick={handleCopy}
                disabled={!qrData?.verifyUrl}
              >
                {copied
                  ? <><Check className="mr-1 h-3 w-3 text-green-600" />Скопировано</>
                  : <><Copy className="mr-1 h-3 w-3" />Скопировать ссылку</>
                }
              </Button>
            </div>
          </div>

          {/* Выбор шаблона отображения */}
          <div className="space-y-1.5">
            <Label>Шаблон отображения</Label>
            <Select value={template} onValueChange={(v) => setTemplate(v as QrTemplate)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(QR_TEMPLATE_LABELS) as QrTemplate[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {QR_TEMPLATE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Позиционирование на PDF */}
          {pdfUrl ? (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Кликните на PDF для выбора позиции QR-штампа
              </Label>
              <div className="cursor-crosshair overflow-hidden rounded-md border">
                <PdfViewer
                  url={pdfUrl}
                  onPageClick={(page, x, y) => setPosition({ page, x, y })}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              Предпросмотр PDF недоступен для этого файла
            </div>
          )}

          {/* Индикатор выбранной позиции */}
          {position ? (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <MapPin className="h-4 w-4" />
              Позиция выбрана: стр. {position.page}, X: {(position.x * 100).toFixed(0)}%,
              Y: {(position.y * 100).toFixed(0)}%
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Кликните по нужному месту на PDF</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={() => createStampMutation.mutate()}
            disabled={!canSubmit}
          >
            <QrCode className="mr-2 h-4 w-4" />
            {createStampMutation.isPending ? 'Создание...' : 'Добавить QR-штамп'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
