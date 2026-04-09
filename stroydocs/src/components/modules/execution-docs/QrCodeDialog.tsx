'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, QrCode, ExternalLink, Stamp } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';

interface QrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId: string;
  docId: string;
  docTitle: string;
  hasS3Key: boolean;
}

export function QrCodeDialog({
  open,
  onOpenChange,
  projectId,
  contractId,
  docId,
  docTitle,
  hasS3Key,
}: QrCodeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const baseUrl = `/api/objects/${projectId}/contracts/${contractId}/execution-docs/${docId}`;

  // Получение / создание токена QR
  const qrMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/qr`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { verifyUrl: string };
    },
    onSuccess: (data) => setVerifyUrl(data.verifyUrl),
    onError: (error: Error) => {
      toast({ title: 'Ошибка получения QR', description: error.message, variant: 'destructive' });
    },
  });

  // Наложение QR-кода на PDF
  const stampMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/qr-stamp`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-doc', docId] });
      queryClient.invalidateQueries({ queryKey: ['execution-docs', contractId] });
      toast({ title: 'QR-код наложен на PDF' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка наложения QR', description: error.message, variant: 'destructive' });
    },
  });

  // При открытии диалога — запросить токен
  useEffect(() => {
    if (open) {
      qrMutation.mutate();
    } else {
      setVerifyUrl(null);
      setQrDataUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Генерация QR-изображения на клиенте
  useEffect(() => {
    if (!verifyUrl) { setQrDataUrl(null); return; }
    let cancelled = false;
    import('qrcode').then((QR) => {
      QR.toDataURL(verifyUrl, { width: 200, margin: 1 }).then((url) => {
        if (!cancelled) setQrDataUrl(url);
      });
    });
    return () => { cancelled = true; };
  }, [verifyUrl]);

  async function handleCopy() {
    if (!verifyUrl) return;
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    toast({ title: 'Ссылка скопирована' });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR-код документа
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="truncate text-sm font-medium">{docTitle}</p>

          <div className="flex justify-center">
            {qrMutation.isPending || !qrDataUrl ? (
              <Skeleton className="h-[200px] w-[200px] rounded-md" />
            ) : (
              <img src={qrDataUrl} alt="QR-код для верификации документа" className="rounded-md border" width={200} height={200} />
            )}
          </div>

          {verifyUrl && (
            <div className="rounded-md border bg-muted/30 p-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Ссылка верификации</p>
              <p className="break-all text-xs text-foreground">{verifyUrl}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            QR-код подтверждает актуальность документа на площадке. Скачать файл по ссылке нельзя — только проверить версию.
          </p>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={handleCopy} disabled={!verifyUrl}>
              {copied ? <Check className="mr-1.5 h-4 w-4 text-green-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
              Скопировать ссылку
            </Button>
            {verifyUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={verifyUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            {hasS3Key && (
              <Button size="sm" variant="outline" onClick={() => stampMutation.mutate()} disabled={stampMutation.isPending || !verifyUrl}>
                <Stamp className="mr-1.5 h-4 w-4" />
                {stampMutation.isPending ? '...' : 'Наложить на PDF'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
