'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, QrCode, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import { useQrInfo } from './useProjectDocuments';

interface QrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  documentId: string | null;
  documentName: string;
}

export function QrCodeDialog({
  open,
  onOpenChange,
  projectId,
  documentId,
  documentName,
}: QrCodeDialogProps) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: qrInfo, isLoading } = useQrInfo(projectId, open ? documentId : null);

  // Генерировать QR-код на клиенте при получении verifyUrl
  useEffect(() => {
    if (!qrInfo?.verifyUrl) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(qrInfo.verifyUrl, { width: 200, margin: 1 }).then((url) => {
        if (!cancelled) setQrDataUrl(url);
      });
    });

    return () => { cancelled = true; };
  }, [qrInfo?.verifyUrl]);

  async function handleCopy() {
    if (!qrInfo?.verifyUrl) return;
    await navigator.clipboard.writeText(qrInfo.verifyUrl);
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
          <p className="truncate text-sm font-medium">{documentName}</p>

          {/* QR-код */}
          <div className="flex justify-center">
            {isLoading || !qrDataUrl ? (
              <Skeleton className="h-[200px] w-[200px] rounded-md" />
            ) : (
              <img
                src={qrDataUrl}
                alt="QR-код для верификации документа"
                className="rounded-md border"
                width={200}
                height={200}
              />
            )}
          </div>

          {/* Ссылка верификации */}
          {qrInfo?.verifyUrl && (
            <div className="rounded-md border bg-muted/30 p-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Ссылка верификации</p>
              <p className="break-all text-xs text-foreground">{qrInfo.verifyUrl}</p>
            </div>
          )}

          {/* Подсказка */}
          <p className="text-xs text-muted-foreground">
            QR-код подтверждает актуальность документа на площадке. Скачать файл по ссылке
            нельзя — только проверить версию.
          </p>

          {/* Кнопки */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleCopy}
              disabled={!qrInfo?.verifyUrl}
            >
              {copied ? (
                <Check className="mr-1.5 h-4 w-4 text-green-600" />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" />
              )}
              Скопировать ссылку
            </Button>
            {qrInfo?.verifyUrl && (
              <Button
                size="sm"
                variant="outline"
                asChild
              >
                <a href={qrInfo.verifyUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
