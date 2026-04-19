'use client';

import { useEffect, useState } from 'react';
import { QrCode, Trash2, Copy, Check, Plus, ExternalLink } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import { AddQrDialog } from './AddQrDialog';
import { isQrStamp } from './types';
import type { PdfStamp, QrData } from './types';

interface PdfQrManagerProps {
  objectId: string;
  docId: string;
  s3Key: string;
  pdfUrl: string | null;
  orgId: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export function PdfQrManager({
  objectId,
  docId,
  s3Key,
  pdfUrl,
  orgId,
}: PdfQrManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrData, setQrData] = useState<QrData | null>(null);

  // Переиспользуем кэш штампов документа — тот же ключ что и PdfStampManager
  const { data: allStamps = [], isLoading } = useQuery<PdfStamp[]>({
    queryKey: ['stamps', objectId, docId],
    queryFn: async () => {
      const params = new URLSearchParams({ entityType: 'DESIGN_DOC', entityId: docId });
      const res = await fetch(`/api/projects/${objectId}/stamps?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки штампов');
      const json: ApiResponse<PdfStamp[]> = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      return json.data;
    },
    enabled: !!objectId && !!docId,
  });

  // Фильтруем только QR-штампы для данного файла
  const qrStamps = allStamps.filter((s) => s.s3Key === s3Key && isQrStamp(s));

  // Получение/генерация QR-токена (идемпотентно)
  const qrMutation = useMutation({
    mutationFn: async (): Promise<QrData> => {
      const res = await fetch(`/api/projects/${objectId}/design-docs/${docId}/qr`, { method: 'POST' });
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

  // Удаление QR-штампа
  const deleteMutation = useMutation({
    mutationFn: async (stampId: string) => {
      const res = await fetch(`/api/projects/${objectId}/stamps/${stampId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err: ApiResponse<null> = await res.json();
        throw new Error(err.error ?? 'Ошибка удаления');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stamps', objectId, docId] });
      toast({ title: 'QR-штамп удалён' });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка удаления', description: err.message, variant: 'destructive' });
    },
  });

  // Загружаем QR-токен при открытии диалога добавления
  useEffect(() => {
    if (openAddDialog && !qrData) {
      qrMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAddDialog]);

  async function handleCopy() {
    if (!qrData?.verifyUrl) return;
    await navigator.clipboard.writeText(qrData.verifyUrl);
    setCopied(true);
    toast({ title: 'Ссылка скопирована' });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs">
            <QrCode className="h-3.5 w-3.5" />
            QR
            {isLoading ? null : (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                {qrStamps.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="end">
          {/* Шапка */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-sm font-medium">QR-штампы</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs"
              onClick={() => setOpenAddDialog(true)}
            >
              <Plus className="h-3 w-3" />
              Добавить QR
            </Button>
          </div>

          {/* Список QR-штампов */}
          <div className="max-h-52 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : qrStamps.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                QR-штампов нет. Нажмите «Добавить QR».
              </div>
            ) : (
              <div className="divide-y">
                {qrStamps.map((stamp) => (
                  <div key={stamp.id} className="flex items-center gap-2 px-3 py-2">
                    <QrCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">QR-код</p>
                      <p className="text-[10px] text-muted-foreground">стр.&nbsp;{stamp.page + 1}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => deleteMutation.mutate(stamp.id)}
                      disabled={deleteMutation.isPending}
                      title="Удалить QR-штамп"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ссылка верификации */}
          <div className="border-t px-3 py-2 space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Ссылка верификации
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-6 flex-1 gap-1 text-[10px]"
                onClick={handleCopy}
                disabled={!qrData?.verifyUrl}
              >
                {copied
                  ? <><Check className="h-3 w-3 text-green-600" />Скопировано</>
                  : <><Copy className="h-3 w-3" />Скопировать ссылку</>
                }
              </Button>
              {qrData?.verifyUrl && (
                <Button variant="outline" size="icon" className="h-6 w-6" asChild>
                  <a href={qrData.verifyUrl} target="_blank" rel="noreferrer" title="Открыть ссылку">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
              {!qrData && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => qrMutation.mutate()}
                  disabled={qrMutation.isPending}
                >
                  {qrMutation.isPending ? 'Загрузка...' : 'Получить'}
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Диалог добавления QR-штампа */}
      <AddQrDialog
        open={openAddDialog}
        onOpenChange={setOpenAddDialog}
        objectId={objectId}
        docId={docId}
        s3Key={s3Key}
        orgId={orgId}
        pdfUrl={pdfUrl}
      />
    </>
  );
}
