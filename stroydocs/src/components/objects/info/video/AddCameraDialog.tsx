'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UploadCloud, X, File as FileIcon, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { VideoCamera, CreateCameraData } from './useCameras';

const schema = z.object({
  cameraNumber: z.string().optional(),
  locationName: z.string().optional(),
  operationalStatus: z.enum(['Работает', 'Не работает']),
  cameraModel: z.string().optional(),
  rtspUrl: z.string().optional(),
  httpUrl: z.string().min(1, 'HTTP ссылка обязательна'),
  failureReason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AttachedFile {
  uid: string;
  fileName: string;
  s3Key: string;
  uploading: boolean;
  error?: string;
}

interface AddCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCamera?: VideoCamera | null;
  objectId: string;
  isPending: boolean;
  onSubmit: (data: CreateCameraData) => void;
}

export function AddCameraDialog({
  open,
  onOpenChange,
  editCamera,
  objectId,
  isPending,
  onSubmit,
}: AddCameraDialogProps) {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [existingFileNames, setExistingFileNames] = useState<string[]>([]);
  const [existingS3Keys, setExistingS3Keys] = useState<string[]>([]);

  const { register, handleSubmit, control, reset, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        operationalStatus: 'Работает',
      },
    });

  // Заполняем форму при открытии
  useEffect(() => {
    if (open) {
      reset({
        cameraNumber: editCamera?.cameraNumber ?? '',
        locationName: editCamera?.locationName ?? '',
        operationalStatus: (editCamera?.operationalStatus as 'Работает' | 'Не работает') ?? 'Работает',
        cameraModel: editCamera?.cameraModel ?? '',
        rtspUrl: editCamera?.rtspUrl ?? '',
        httpUrl: editCamera?.httpUrl ?? '',
        failureReason: editCamera?.failureReason ?? '',
      });
      setAttachedFiles([]);
      setExistingFileNames(editCamera?.fileNames ?? []);
      setExistingS3Keys(editCamera?.s3Keys ?? []);
    }
  }, [open, editCamera, reset]);

  // Загрузка файла в S3 через presigned URL и обновление состояния по uid
  const uploadOne = useCallback(async (uid: string, file: File) => {
    try {
      const res = await fetch(`/api/objects/${objectId}/cameras/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
        }),
      });
      const json = await res.json() as { success: boolean; data?: { s3Key: string; uploadUrl: string }; error?: string };
      if (!json.success || !json.data) throw new Error(json.error ?? 'Ошибка сервера');

      await fetch(json.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });

      setAttachedFiles((prev) =>
        prev.map((af) =>
          af.uid === uid ? { ...af, s3Key: json.data!.s3Key, uploading: false } : af
        )
      );
    } catch {
      setAttachedFiles((prev) =>
        prev.map((af) =>
          af.uid === uid ? { ...af, uploading: false, error: 'Ошибка загрузки' } : af
        )
      );
    }
  }, [objectId]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newEntries: AttachedFile[] = acceptedFiles.map((f) => ({
        uid: `${Date.now()}-${Math.random()}`,
        fileName: f.name,
        s3Key: '',
        uploading: true,
      }));
      setAttachedFiles((prev) => [...prev, ...newEntries]);

      acceptedFiles.forEach((file, i) => {
        void uploadOne(newEntries[i].uid, file);
      });
    },
    [uploadOne]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  function removeNewFile(uid: string) {
    setAttachedFiles((prev) => prev.filter((af) => af.uid !== uid));
  }

  function removeExistingFile(index: number) {
    setExistingFileNames((prev) => prev.filter((_, i) => i !== index));
    setExistingS3Keys((prev) => prev.filter((_, i) => i !== index));
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      reset();
      setAttachedFiles([]);
      setExistingFileNames([]);
      setExistingS3Keys([]);
    }
    onOpenChange(isOpen);
  }

  function onValid(values: FormValues) {
    const uploadedNew = attachedFiles.filter((af) => af.s3Key && !af.error);
    const newS3Keys = uploadedNew.map((af) => af.s3Key);
    const newFileNames = uploadedNew.map((af) => af.fileName);

    onSubmit({
      ...values,
      s3Keys: [...existingS3Keys, ...newS3Keys],
      fileNames: [...existingFileNames, ...newFileNames],
    });
  }

  const isUploading = attachedFiles.some((af) => af.uploading);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editCamera ? 'Редактировать камеру' : 'Добавить камеру'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4">
          {/* Камера № */}
          <div className="space-y-1">
            <Label className="text-xs">Камера №</Label>
            <Input {...register('cameraNumber')} placeholder="Например: 1" />
          </div>

          {/* Наименование точки видеосъёмки */}
          <div className="space-y-1">
            <Label className="text-xs">Наименование точки видеосъёмки</Label>
            <Input {...register('locationName')} placeholder="Например: Въезд на объект" />
          </div>

          {/* Состояние */}
          <div className="space-y-1">
            <Label className="text-xs">Состояние работоспособности</Label>
            <Controller
              name="operationalStatus"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Работает">Работает</SelectItem>
                    <SelectItem value="Не работает">Не работает</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Модель камеры */}
          <div className="space-y-1">
            <Label className="text-xs">Модель камеры</Label>
            <Input {...register('cameraModel')} placeholder="Например: Hikvision DS-2CD2143G2-I" />
          </div>

          {/* Ссылка RTSP */}
          <div className="space-y-1">
            <Label className="text-xs">Ссылка RTSP (необязательно)</Label>
            <Input {...register('rtspUrl')} placeholder="rtsp://..." />
          </div>

          {/* Ссылка HTTP */}
          <div className="space-y-1">
            <Label className="text-xs">Ссылка HTTP *</Label>
            <Input {...register('httpUrl')} placeholder="http://..." />
            {errors.httpUrl && (
              <p className="text-xs text-destructive">{errors.httpUrl.message}</p>
            )}
          </div>

          {/* Причина неработоспособности */}
          <div className="space-y-1">
            <Label className="text-xs">Причина неработоспособности (необязательно)</Label>
            <Textarea
              {...register('failureReason')}
              placeholder="Опишите причину, если камера не работает"
              rows={2}
            />
          </div>

          {/* Загрузка файлов */}
          <div className="space-y-2">
            <Label className="text-xs">Файлы (необязательно)</Label>

            {/* Существующие файлы (при редактировании) */}
            {existingFileNames.length > 0 && (
              <ul className="space-y-1">
                {existingFileNames.map((name, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{name}</span>
                    <button
                      type="button"
                      onClick={() => removeExistingFile(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Зона drag-and-drop */}
            <div
              {...getRootProps()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-primary/50'
              )}
            >
              <input {...getInputProps()} />
              <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? 'Отпустите файлы'
                  : 'Перетащите файлы или нажмите для выбора'}
              </p>
            </div>

            {/* Новые файлы */}
            {attachedFiles.length > 0 && (
              <ul className="space-y-1">
                {attachedFiles.map((af) => (
                  <li key={af.uid} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                    {af.uploading ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={cn('flex-1 truncate', af.error && 'text-destructive')}>
                      {af.fileName}
                      {af.error && ` — ${af.error}`}
                    </span>
                    {!af.uploading && (
                      <button
                        type="button"
                        onClick={() => removeNewFile(af.uid)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending || isUploading}>
              {isPending
                ? 'Сохранение...'
                : isUploading
                ? 'Загрузка файлов...'
                : editCamera
                ? 'Сохранить'
                : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
