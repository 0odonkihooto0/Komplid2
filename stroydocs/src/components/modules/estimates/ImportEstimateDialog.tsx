'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEstimateUpload } from './useEstimatePreview';
import { useChunkedExcelUpload } from './useChunkedExcelUpload';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId: string;
}

const ACCEPTED_FORMATS = '.xml,.xlsx,.pdf';

/** Определяет, является ли файл Excel */
function isExcelFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith('.xlsx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

type DialogStep = 'upload' | 'processing';

export function ImportEstimateDialog({ open, onOpenChange, projectId, contractId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dialogStep, setDialogStep] = useState<DialogStep>('upload');

  // Стандартный хук для XML/PDF
  const { uploadMutation } = useEstimateUpload(projectId, contractId);

  // Хук для Excel с чанкованием (без шага выбора строк)
  const {
    uploadAndProcess,
    uploadStep,
    streamedItems,
    progress,
    isProcessing: isChunking,
    resetAll,
  } = useChunkedExcelUpload(projectId, contractId);

  const handleClose = () => {
    if (isProcessing) return;
    setFile(null);
    setDialogStep('upload');
    resetAll();
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    resetAll();
    setDialogStep('upload');
  };

  const handleUpload = async () => {
    if (!file) return;

    if (isExcelFile(file)) {
      // Новый конвейер: загружаем + prepare-chunks + автообработка всех строк
      setDialogStep('processing');
      const result = await uploadAndProcess(file);
      if (result) {
        handleClose();
        if (result.status === 'PREVIEW') {
          router.push(
            `/projects/${projectId}/contracts/${contractId}/estimates/${result.importId}`
          );
        }
      } else {
        setDialogStep('upload');
      }
    } else {
      // Старый конвейер: XML/PDF через /start
      uploadMutation.mutate(file, {
        onSuccess: (data) => {
          setFile(null);
          handleClose();
          if (data?.id && data.status === 'PREVIEW') {
            router.push(
              `/projects/${projectId}/contracts/${contractId}/estimates/${data.id}`
            );
          } else if (data?.duplicateOf) {
            router.push(
              `/projects/${projectId}/contracts/${contractId}/estimates/${data.duplicateOf}`
            );
          }
        },
      });
    }
  };

  const isProcessing = uploadMutation.isPending || isChunking || uploadStep === 'uploading';

  const progressPercent =
    progress && progress.totalChunks > 0
      ? Math.round((progress.processedChunks / progress.totalChunks) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          'transition-all duration-300',
          dialogStep === 'processing' ? 'max-w-2xl' : 'max-w-md'
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {dialogStep === 'upload' ? 'Импорт сметы' : 'Обработка сметы'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Загрузите файл сметы для автоматического разбора и импорта позиций
          </DialogDescription>
        </DialogHeader>

        {/* ШАГ 1: Выбор файла */}
        {dialogStep === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Загрузите файл сметы в формате XML (Гранд-Смета, РИК), Excel (.xlsx) или PDF.
              Позиции будут автоматически распознаны и привязаны к КСИ.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FORMATS}
              className="hidden"
              onChange={handleFileChange}
            />

            <Button
              type="button"
              variant="outline"
              className="w-full h-24 border-dashed"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {file ? (
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} КБ
                      {isExcelFile(file) && (
                        <span className="ml-2 text-blue-600">• Автоматическая обработка</span>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Выбрать файл сметы</span>
                </div>
              )}
            </Button>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isProcessing}>
                Отмена
              </Button>
              <Button onClick={handleUpload} disabled={!file || isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  'Загрузить'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ШАГ 2: Обработка с прогрессом и стримингом */}
        {dialogStep === 'processing' && (
          <div className="space-y-4">
            {/* Прогресс-бар */}
            {progress ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {uploadStep === 'enriching'
                      ? 'Обогащение нормативами...'
                      : progress.processedChunks < progress.totalChunks
                      ? `Обработка блока ${progress.processedChunks + 1} из ${progress.totalChunks}...`
                      : 'Финализация импорта...'}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                {progress.usedFallback && (
                  <p className="text-xs text-amber-600">
                    Использован резервный AI для части блоков
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Подготовка файла...</p>
                <Progress value={0} className="h-2" />
              </div>
            )}

            {/* Строки в реальном времени */}
            {streamedItems.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Распознано позиций: {streamedItems.length}
                </p>
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Наименование</th>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-16">Ед.</th>
                        <th className="px-3 py-1.5 text-right font-medium text-muted-foreground w-16">Объём</th>
                      </tr>
                    </thead>
                    <tbody>
                      {streamedItems.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1">
                            <span className={cn(
                              'line-clamp-1',
                              item.itemType === 'MATERIAL' && 'pl-4 text-muted-foreground'
                            )}>
                              {item.rawName}
                            </span>
                          </td>
                          <td className="px-3 py-1 text-muted-foreground">{item.rawUnit || '—'}</td>
                          <td className="px-3 py-1 text-right">{item.volume ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Предупреждения о пропущенных чанках */}
            {progress && progress.skippedChunks.length > 0 && !isChunking && (
              <Alert variant="default" className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800">
                  <strong>{progress.skippedChunks.length} блок(а)</strong> не удалось обработать
                  автоматически. Добавьте позиции вручную на странице предпросмотра.
                </AlertDescription>
              </Alert>
            )}

            {isChunking && !progress && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
