'use client';

import dynamic from 'next/dynamic';
import { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileX } from 'lucide-react';
import { PdfStampItem } from './PdfStampItem';
import { usePdfStampPreview } from './usePdfStampPreview';
import type { PdfStamp } from './types';

// react-pdf не совместим с SSR — загружаем только на клиенте
const PdfViewer = dynamic(
  () => import('@/components/shared/PdfViewer').then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse rounded-md bg-muted" />,
  },
);

interface PdfStampPreviewProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pdfUrl: string | null;
  stamps: PdfStamp[];
  objectId: string;
}

export function PdfStampPreview({
  open,
  onOpenChange,
  pdfUrl,
  stamps,
  objectId,
}: PdfStampPreviewProps) {
  // Все хуки объявляются ДО любых условных return (правило React Hooks)
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 600, height: 800 });

  const {
    editingStamp,
    setEditingStamp,
    editText,
    setEditText,
    handleDragEnd,
    handleResizeEnd,
    handleDelete,
    handleEditStart,
    handleEditSave,
    editTextMutation,
  } = usePdfStampPreview({ objectId, currentPage });

  // Обновляем размеры контейнера при открытии диалога
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    }
  }, [open]);

  // Фильтруем штампы для текущей страницы (page 0-based в данных)
  const pageStamps = stamps.filter((s) => s.page === currentPage - 1);

  return (
    <>
      {/* Основной диалог предпросмотра со штампами */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          {/* Заголовок */}
          <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
            <div className="flex-1">
              <h2 className="text-base font-semibold">Предпросмотр со штампами</h2>
              <p className="text-xs text-muted-foreground">стр. {currentPage}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ←
              </Button>
              <span className="text-sm px-2">стр. {currentPage}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                →
              </Button>
            </div>
          </div>

          {/* Тело */}
          <div className="flex-1 overflow-auto p-4">
            {pdfUrl === null ? (
              // Файл недоступен
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <FileX className="h-12 w-12" />
                <p className="text-sm">Файл недоступен для предпросмотра</p>
              </div>
            ) : (
              // Контейнер PDF с наложенными штампами
              <div ref={containerRef} className="relative inline-block">
                <PdfViewer url={pdfUrl} />

                {/* Штампы текущей страницы */}
                {pageStamps.map((s) => (
                  <PdfStampItem
                    key={s.id}
                    stamp={s}
                    containerWidth={containerSize.width}
                    containerHeight={containerSize.height}
                    onDragEnd={handleDragEnd}
                    onResizeEnd={handleResizeEnd}
                    onDelete={handleDelete}
                    onEdit={handleEditStart}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Вложенный диалог редактирования текста штампа */}
      <Dialog
        open={!!editingStamp}
        onOpenChange={(o) => {
          if (!o) setEditingStamp(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редактировать текст штампа</DialogTitle>
            <DialogDescription>
              Введите новый текст для отображения на штампе
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label htmlFor="stamp-edit-text" className="mb-1.5 block text-sm">
              Текст штампа
            </Label>
            <Input
              id="stamp-edit-text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Введите текст..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStamp(null)}>
              Отмена
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={!editText.trim() || editTextMutation.isPending}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
