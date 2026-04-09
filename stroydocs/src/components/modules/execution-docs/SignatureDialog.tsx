'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signatureType: 'embedded' | 'detached';
  docTitle?: string;
}

/** UI-заглушка модалки подписания (Фаза 4 — КриптоПро). Камера включается при открытии. */
export function SignatureDialog({ open, onOpenChange, signatureType, docTitle }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamError, setStreamError] = useState(false);
  const [selectedCert, setSelectedCert] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setStreamError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setStreamError(true);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  const typeLabel = signatureType === 'embedded' ? 'встроенной' : 'открепленной';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Подписание {typeLabel} подписью</DialogTitle>
          {docTitle && <p className="text-sm text-muted-foreground">{docTitle}</p>}
        </DialogHeader>

        <div className="space-y-4">
          {/* Видео с камеры */}
          <div className="relative overflow-hidden rounded-lg bg-black aspect-video flex items-center justify-center">
            {streamError ? (
              <div className="flex flex-col items-center gap-2 text-white/70">
                <CameraOff className="h-10 w-10" />
                <p className="text-sm text-center">Камера недоступна. Разрешите доступ к камере в браузере.</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1">
              <Camera className="h-3 w-3 text-white" />
              <span className="text-xs text-white">Смотрите в камеру</span>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={startCamera} className="w-full">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Переснять
          </Button>

          {/* Выбор сертификата КриптоПро */}
          <div className="space-y-2">
            <Label>Сертификат КриптоПро</Label>
            <Select value={selectedCert} onValueChange={setSelectedCert}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите сертификат..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>
                  — Сертификаты не найдены —
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Убедитесь, что КриптоПро CSP установлен и сертификат добавлен в систему.
            </p>
          </div>

          {/* Кнопка подписания */}
          <Button className="w-full" disabled title="Настройте КриптоПро для подписания">
            <Shield className="mr-2 h-4 w-4" />
            Подписать запись
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Функция ЭЦП будет доступна в Фазе 4. Настройте КриптоПро для подписания.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
