'use client';

import { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileSpreadsheet, Upload, UploadCloud, CheckCircle2 } from 'lucide-react';
import type { SpecialJournalType } from '@prisma/client';
import { useExcelImport } from './useExcelImport';

interface Props {
  objectId: string;
  journalId: string;
  journalType: SpecialJournalType;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

export function ExcelImportDialog({
  objectId,
  journalId,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const queryClient = useQueryClient();
  const vm = useExcelImport(objectId, journalId);

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!open) vm.reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) {
        vm.previewFile(accepted[0]);
      }
    },
    [vm]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    disabled: vm.isPreviewLoading,
  });

  const handleConfirm = async () => {
    await vm.confirmImport();
    // Инвалидируем список записей после успешного импорта (queryKey совпадает с useJournalCard)
    void queryClient.invalidateQueries({
      queryKey: ['journal-entries', objectId, journalId],
    });
  };

  const handleClose = () => {
    if (!vm.isPreviewLoading && !vm.isImporting) {
      onOpenChange(false);
    }
  };

  const handleDone = () => {
    onSuccess();
    onOpenChange(false);
  };

  // Шаг: результат импорта
  if (vm.stats) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Импорт завершён</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-medium">
              Импортировано записей: <span className="text-green-700">{vm.stats.imported}</span>
            </p>
            {vm.stats.skipped > 0 && (
              <p className="text-sm text-muted-foreground">
                Пропущено (без даты или описания): {vm.stats.skipped}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleDone}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Шаг: предпросмотр строк
  if (vm.previewRows) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Предпросмотр импорта</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Найдено записей:{' '}
              <span className="font-medium text-foreground">{vm.previewRows.length}</span>
              {vm.previewSkipped > 0 && (
                <span className="ml-2 text-orange-600">
                  · пропущено {vm.previewSkipped} (нет даты или описания)
                </span>
              )}
            </p>

            {vm.previewRows.length > 0 ? (
              <ScrollArea className="h-64 rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium w-28">Дата</th>
                      <th className="px-3 py-2 text-left font-medium">Описание</th>
                      <th className="px-3 py-2 text-left font-medium w-32">Местоположение</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vm.previewRows.slice(0, 50).map((row) => (
                      <tr key={row.rowIndex} className="border-t">
                        <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="px-3 py-1.5 max-w-xs truncate">{row.description}</td>
                        <td className="px-3 py-1.5 text-muted-foreground truncate">
                          {row.location ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vm.previewRows.length > 50 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Показаны первые 50 из {vm.previewRows.length} строк
                  </p>
                )}
              </ScrollArea>
            ) : (
              <div className="rounded-md border bg-orange-50 px-4 py-3 text-sm text-orange-700">
                В файле не найдено строк с заполненными датой и описанием.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={vm.reset}>
              Назад
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={vm.previewRows.length === 0 || vm.isImporting}
            >
              {vm.isImporting
                ? 'Импорт...'
                : `Импортировать ${vm.previewRows.length} записей`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Шаг: выбор файла (idle / загрузка превью)
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Импорт записей из Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Скачать шаблон */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Подготовьте данные по шаблону:</span>
            <button
              type="button"
              className="flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
              onClick={vm.downloadTemplate}
              disabled={vm.isDownloading}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {vm.isDownloading ? 'Загрузка...' : 'Скачать шаблон'}
            </button>
          </div>

          {/* Зона загрузки файла */}
          <div
            {...getRootProps()}
            className={[
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/30 hover:border-primary/50',
              vm.isPreviewLoading ? 'opacity-50 pointer-events-none' : '',
            ].join(' ')}
          >
            <input {...getInputProps()} />
            {vm.isPreviewLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Upload className="mx-auto h-10 w-10 text-muted-foreground animate-bounce" />
                <p className="text-sm text-muted-foreground">Анализируем файл...</p>
              </div>
            ) : isDragActive ? (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="mx-auto h-10 w-10 text-primary" />
                <p className="text-sm text-primary">Отпустите файл здесь...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Перетащите .xlsx файл или{' '}
                  <span className="text-primary">нажмите для выбора</span>
                </p>
                <p className="text-xs text-muted-foreground/70">Только формат .xlsx</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
