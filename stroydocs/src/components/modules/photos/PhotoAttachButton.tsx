'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { PHOTO_CATEGORY_LABELS } from '@/utils/constants';
import type { PhotoEntityType, PhotoCategory } from '@prisma/client';

interface Props {
  entityType: PhotoEntityType;
  entityId: string;
  className?: string;
}

/** Кнопка для прикрепления фото к сущности (PWA камера + сжатие) */
export function PhotoAttachButton({ entityType, entityId, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<PhotoCategory | undefined>();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Сжатие на клиенте
      let compressedFile = file;
      try {
        const imageCompression = (await import('browser-image-compression')).default;
        compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
      } catch {
        // Если сжатие не удалось, загружаем оригинал
      }

      // Получаем GPS из geolocation API
      let gpsLat: number | undefined;
      let gpsLng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        gpsLat = pos.coords.latitude;
        gpsLng = pos.coords.longitude;
      } catch {
        // GPS недоступен — пропускаем
      }

      // Шаг 1: создаём запись и получаем upload URL
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          fileName: compressedFile.name,
          mimeType: compressedFile.type,
          size: compressedFile.size,
          gpsLat,
          gpsLng,
          takenAt: new Date().toISOString(),
          category,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      // Шаг 2: загружаем файл напрямую в S3
      const s3Res = await fetch(json.data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': compressedFile.type },
        body: compressedFile,
      });
      if (!s3Res.ok) throw new Error(`Ошибка загрузки в хранилище: ${s3Res.status}`);

      return json.data.photo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      toast({ title: 'Фото загружено' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка загрузки', description: error.message, variant: 'destructive' });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      e.target.value = ''; // Сброс для повторного выбора того же файла
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={category || ''}
        onValueChange={(v) => setCategory(v as PhotoCategory || undefined)}
      >
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Категория" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PHOTO_CATEGORY_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        disabled={uploadMutation.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="h-4 w-4 mr-1" />
        {uploadMutation.isPending ? 'Загрузка...' : 'Фото'}
      </Button>
    </div>
  );
}
