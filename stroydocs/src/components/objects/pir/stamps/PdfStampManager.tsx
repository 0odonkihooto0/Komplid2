'use client';

import { Stamp, Trash2, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { AddStampDialog } from './AddStampDialog';
import { PdfStampPreview } from './PdfStampPreview';
import { usePdfStampManager } from './usePdfStampManager';

interface PdfStampManagerProps {
  objectId: string;
  docId: string;
  s3Key: string;
  pdfUrl: string | null;
  orgId: string;
}

export function PdfStampManager({
  objectId,
  docId,
  s3Key,
  pdfUrl,
  orgId,
}: PdfStampManagerProps) {
  const {
    stamps,
    isLoading,
    deleteMutation,
    openAddDialog,
    setOpenAddDialog,
    openPreview,
    setOpenPreview,
  } = usePdfStampManager({ objectId, docId, s3Key });

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs">
            <Stamp className="h-3.5 w-3.5" />
            Штампы
            {isLoading ? null : (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                {stamps.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="end">
          {/* Шапка поповера */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-sm font-medium">Штампы на файле</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs"
              onClick={() => setOpenAddDialog(true)}
            >
              <Plus className="h-3 w-3" />
              Добавить
            </Button>
          </div>

          {/* Список штампов */}
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : stamps.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Штампов нет. Нажмите «Добавить».
              </div>
            ) : (
              <div className="divide-y">
                {stamps.map((stamp) => (
                  <div
                    key={stamp.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <Stamp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-xs">{stamp.stampText}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      стр.&nbsp;{stamp.page + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => deleteMutation.mutate(stamp.id)}
                      disabled={deleteMutation.isPending}
                      title="Удалить штамп"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Кнопка предпросмотра */}
          <div className="border-t px-3 py-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              disabled={pdfUrl === null}
              onClick={() => setOpenPreview(true)}
              title={pdfUrl === null ? 'Предпросмотр доступен только для текущего файла' : undefined}
            >
              <Eye className="h-3.5 w-3.5" />
              Предпросмотр со штампами
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Диалог добавления штампа */}
      <AddStampDialog
        open={openAddDialog}
        onOpenChange={setOpenAddDialog}
        objectId={objectId}
        docId={docId}
        s3Key={s3Key}
        orgId={orgId}
      />

      {/* Предпросмотр PDF со штампами */}
      <PdfStampPreview
        open={openPreview}
        onOpenChange={setOpenPreview}
        pdfUrl={pdfUrl}
        stamps={stamps}
        objectId={objectId}
      />
    </>
  );
}
