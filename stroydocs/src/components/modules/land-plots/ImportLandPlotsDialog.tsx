'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, UploadCloud, X } from 'lucide-react';
import { toast } from '@/hooks/useToast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
}

interface ImportResult {
  imported: number;
  updated: number;
}

export function ImportLandPlotsDialog({ open, onOpenChange, projectId }: Props) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setError(null);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  const handleDownloadTemplate = () => {
    window.open(`/api/projects/${projectId}/land-plots/template`, '_blank');
  };

  const handleImport = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/projects/${projectId}/land-plots/import`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error ?? 'Ошибка импорта');
        return;
      }

      const importResult = json.data as ImportResult;
      setResult(importResult);
      await queryClient.invalidateQueries({ queryKey: ['land-plots', projectId] });
      toast({
        title: 'Импорт завершён',
        description: `Добавлено: ${importResult.imported}, обновлено: ${importResult.updated}`,
      });
    } catch {
      setError('Произошла ошибка при импорте. Попробуйте ещё раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFile(null);
      setError(null);
      setResult(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Импорт земельных участков</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ссылка на шаблон */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Используйте шаблон для подготовки данных:</span>
            <button
              type="button"
              className="flex items-center gap-1 text-primary hover:underline"
              onClick={handleDownloadTemplate}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Скачать шаблон
            </button>
          </div>

          {/* Зона загрузки */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            {isDragActive ? (
              <p className="text-sm text-primary">Отпустите файл здесь...</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Перетащите .xlsx файл или{' '}
                <span className="text-primary">нажмите для выбора</span>
              </p>
            )}
          </div>

          {/* Выбранный файл */}
          {file && (
            <div className="flex items-center justify-between bg-muted rounded-md px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span className="truncate max-w-[260px]">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); setError(null); setResult(null); }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Результат импорта */}
          {result && (
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              Импортировано: <strong>{result.imported}</strong>, обновлено: <strong>{result.updated}</strong>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {result ? 'Закрыть' : 'Отмена'}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || isLoading}
          >
            {isLoading ? 'Импорт...' : 'Импортировать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
