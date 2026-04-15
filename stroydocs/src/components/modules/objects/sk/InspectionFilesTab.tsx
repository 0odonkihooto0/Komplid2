'use client';

import { useRef } from 'react';
import { Upload, Trash2, Download, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInspectionAttachments } from './useInspections';

interface Props {
  objectId: string;
  inspectionId: string;
}

export function InspectionFilesTab({ objectId, inspectionId }: Props) {
  const { query, upload, remove } = useInspectionAttachments(objectId, inspectionId, true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attachments = query.data ?? [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    // Сбрасываем input чтобы можно было выбрать тот же файл повторно
    e.target.value = '';
  };

  return (
    <div className="py-4 space-y-4">
      {/* Пояснение */}
      <p className="text-sm text-muted-foreground">
        Прикрепляйте файлы ко всей проверке, а не к конкретному недостатку
      </p>

      {/* Кнопка загрузки */}
      <div className="flex gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1.5" />
          {upload.isPending ? 'Загрузка...' : 'Выбрать с компьютера'}
        </Button>
      </div>

      {/* Список файлов */}
      {query.isLoading && (
        <p className="text-sm text-muted-foreground">Загрузка файлов...</p>
      )}

      {!query.isLoading && attachments.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          Нет прикреплённых файлов
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((file) => (
            <div
              key={file.s3Key}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{file.fileName}</span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={file.fileName}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(file.s3Key)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
