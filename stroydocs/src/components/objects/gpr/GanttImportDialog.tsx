'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, UploadCloud, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  useGanttImport,
  getAcceptForFormat,
  FORMAT_LABELS,
  type ImportFormat,
} from './useGanttImport';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  objectId: string;
  versionId: string;
  format: ImportFormat;
  hasExistingTasks: boolean;
}

/** Инструкции по формату для Primavera/MS Project */
const FORMAT_HINTS: Partial<Record<ImportFormat, string>> = {
  PRIMAVERA: 'Загрузите файл формата .xer, экспортированный из Primavera P6.',
  MS_PROJECT: 'Загрузите файл формата .xml или .mpp, экспортированный из Microsoft Project.',
};

export function GanttImportDialog({
  open, onOpenChange, objectId, versionId, format, hasExistingTasks,
}: Props) {
  const imp = useGanttImport(objectId, versionId, format, hasExistingTasks);
  const isSpider = format === 'SPIDER';

  const onDrop = useCallback(
    (accepted: File[]) => { if (accepted[0]) imp.setFile(accepted[0]); },
    [imp],
  );

  const accept = getAcceptForFormat(format);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ?? undefined,
    maxFiles: 1,
    disabled: isSpider,
  });

  function handleClose() {
    if (imp.step === 'importing') return;
    imp.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Импортировать ГПР — {FORMAT_LABELS[format]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Предупреждение о замене */}
          {hasExistingTasks && !isSpider && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Внимание: текущие данные ГПР будут стёрты и перезаполнены.</span>
            </div>
          )}

          {/* Spider — заглушка */}
          {isSpider && (
            <div className="rounded-md border border-muted bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
              Поддержка Spider Project находится в разработке. Скоро будет доступна.
            </div>
          )}

          {/* Excel: шаблон + НДС */}
          {format === 'EXCEL' && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Подготовьте файл по шаблону:</span>
                <button
                  type="button"
                  className="flex items-center gap-1 text-primary hover:underline"
                  onClick={() => window.open(
                    `/api/projects/${objectId}/gantt-versions/gpr-template`,
                    '_blank',
                  )}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Скачать шаблон
                </button>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Стоимость в файле</Label>
                <RadioGroup
                  value={imp.withVat ? 'vat' : 'novat'}
                  onValueChange={(v) => imp.setWithVat(v === 'vat')}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="vat" />
                    <Label className="text-sm font-normal cursor-pointer">С НДС</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="novat" />
                    <Label className="text-sm font-normal cursor-pointer">Без НДС</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {/* Инструкция для Primavera / MS Project */}
          {FORMAT_HINTS[format] && (
            <p className="text-sm text-muted-foreground">{FORMAT_HINTS[format]}</p>
          )}

          {/* Dropzone */}
          {!isSpider && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/30 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              {isDragActive ? (
                <p className="text-sm text-primary">Отпустите файл здесь...</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Перетащите файл или{' '}
                  <span className="text-primary">нажмите для выбора</span>
                </p>
              )}
            </div>
          )}

          {/* Выбранный файл */}
          {imp.file && (
            <div className="flex items-center justify-between bg-muted rounded-md px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span className="truncate max-w-[260px]">{imp.file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => imp.setFile(null)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Статус */}
          {imp.step === 'validating' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Файл загружен, идёт проверка...
            </div>
          )}
          {imp.step === 'ready' && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Файл готов для импорта
            </div>
          )}
          {imp.step === 'importing' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Импортирую...
            </div>
          )}
          {imp.step === 'success' && imp.importResult && (
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 space-y-1">
              <p>Импортировано: <strong>{imp.importResult.taskCount}</strong> задач, <strong>{imp.importResult.depCount}</strong> зависимостей</p>
              {imp.importResult.warnings.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-yellow-700">
                    Предупреждения ({imp.importResult.warnings.length})
                  </summary>
                  <ul className="mt-1 list-disc pl-4 text-yellow-700">
                    {imp.importResult.warnings.slice(0, 10).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
          {imp.step === 'error' && imp.error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {imp.error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={imp.step === 'importing'}>
            {imp.step === 'success' ? 'Закрыть' : 'Отмена'}
          </Button>
          {!isSpider && (
            <Button
              onClick={imp.handleImport}
              disabled={imp.step !== 'ready'}
            >
              {imp.step === 'importing' ? 'Импорт...' : 'Импортировать ГПР'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
