'use client';

// Компонент для отображения и управления вложениями заявок

import { useDropzone } from 'react-dropzone';
import { Paperclip, Download, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAttachments } from './useResourceAttachments';

// ─── Пропсы ──────────────────────────────────────────────────────────────────

interface Props {
  apiBasePath: string;
  parentQueryKey: unknown[];
}

// ─── Компонент ───────────────────────────────────────────────────────────────

export function ResourceAttachments({ apiBasePath, parentQueryKey }: Props) {
  const { attachments, isLoading, upload, remove } = useAttachments(apiBasePath, parentQueryKey);

  // Настройка зоны перетаскивания файлов
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files.forEach((f) => upload.mutate(f)),
    multiple: true,
  });

  return (
    <div className="space-y-4 pt-2">
      {/* Зона загрузки файлов */}
      <div
        {...getRootProps()}
        className={[
          'flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-6 py-8 cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
          upload.isPending ? 'opacity-60 pointer-events-none' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <input {...getInputProps()} />
        <Upload className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          {isDragActive ? 'Отпустите для загрузки' : 'Перетащите файлы сюда или нажмите для выбора'}
        </p>
        <p className="text-xs text-muted-foreground">Поддерживаются все типы файлов</p>
      </div>

      {/* Состояние загрузки списка */}
      {isLoading && (
        <p className="text-sm text-muted-foreground py-2">Загрузка...</p>
      )}

      {/* Список вложений */}
      {!isLoading && attachments.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border">
          {attachments.map((attachment) => (
            <li key={attachment.s3Key} className="flex items-center gap-2 px-3 py-2">
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{attachment.fileName}</span>
              {/* Кнопка скачивания */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(attachment.downloadUrl, '_blank')}
                aria-label={`Скачать ${attachment.fileName}`}
              >
                <Download className="h-4 w-4" />
              </Button>
              {/* Кнопка удаления */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove.mutate(attachment.s3Key)}
                disabled={remove.isPending}
                aria-label={`Удалить ${attachment.fileName}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Пустое состояние */}
      {!isLoading && attachments.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">Файлы не прикреплены</p>
      )}
    </div>
  );
}
