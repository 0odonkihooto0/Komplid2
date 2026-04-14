'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Trash2, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AttachmentItem {
  s3Key: string;
  fileName: string;
}

interface Props {
  docId: string | null;
  attachments: AttachmentItem[];
  isUploading: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (s3Key: string, fileName: string) => void;
}

// Вкладка «Файлы» в карточке GENERAL_DOCUMENT — dropzone + список вложений
export function GeneralDocFilesTab({ docId, attachments, isUploading, onUpload, onDelete }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (!docId) return;
      onUpload(accepted);
    },
    [docId, onUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !docId || isUploading,
  });

  return (
    <div className="space-y-4 mt-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        } ${isUploading || !docId ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Загрузка...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-6 w-6" />
            <span className="text-sm">
              {isDragActive ? 'Отпустите файлы' : 'Перетащите файлы или нажмите для выбора'}
            </span>
          </div>
        )}
      </div>

      {attachments.length === 0 && !isUploading && (
        <p className="text-sm text-muted-foreground text-center py-2">Нет прикреплённых файлов</p>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((att) => (
            <li key={att.fileName} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2 text-sm truncate">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{att.fileName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-2 shrink-0"
                onClick={() => onDelete(att.s3Key, att.fileName)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
