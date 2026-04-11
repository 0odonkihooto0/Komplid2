'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PdfStamp } from './types';

interface PdfStampItemProps {
  stamp: PdfStamp;
  containerWidth: number;
  containerHeight: number;
  onDragEnd: (id: string, x: number, y: number) => void;
  onResizeEnd: (id: string, w: number, h: number) => void;
  onDelete: (id: string) => void;
  onEdit: (stamp: PdfStamp) => void;
}

/** Зажим значения в диапазон [min, max] */
function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

export function PdfStampItem({
  stamp,
  containerWidth,
  containerHeight,
  onDragEnd,
  onResizeEnd,
  onDelete,
  onEdit,
}: PdfStampItemProps) {
  // Локальная позиция для оптимистичного обновления во время перетаскивания
  const [localPos, setLocalPos] = useState({ x: stamp.positionX, y: stamp.positionY });

  // Локальный размер для оптимистичного обновления во время ресайза
  const [localSize, setLocalSize] = useState({ w: stamp.width, h: stamp.height });

  // Refs для перетаскивания
  const isDragging = useRef(false);
  const dragStartPointer = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Refs для изменения размера
  const isResizing = useRef(false);
  const resizeStartPointer = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ w: 0, h: 0 });

  // Синхронизируем локальную позицию с пропсами когда не тащим
  useEffect(() => {
    if (!isDragging.current) {
      setLocalPos({ x: stamp.positionX, y: stamp.positionY });
    }
  }, [stamp.positionX, stamp.positionY]);

  // Синхронизируем локальный размер с пропсами когда не ресайзим
  useEffect(() => {
    if (!isResizing.current) {
      setLocalSize({ w: stamp.width, h: stamp.height });
    }
  }, [stamp.width, stamp.height]);

  // --- Обработчики перетаскивания ---

  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    dragStartPointer.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { x: localPos.x, y: localPos.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      const dx = (e.clientX - dragStartPointer.current.x) / containerWidth;
      const dy = (e.clientY - dragStartPointer.current.y) / containerHeight;
      setLocalPos({
        x: clamp(0, 1, dragStartPos.current.x + dx),
        y: clamp(0, 1, dragStartPos.current.y + dy),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      isDragging.current = false;
      const dx = (e.clientX - dragStartPointer.current.x) / containerWidth;
      const dy = (e.clientY - dragStartPointer.current.y) / containerHeight;
      const finalX = clamp(0, 1, dragStartPos.current.x + dx);
      const finalY = clamp(0, 1, dragStartPos.current.y + dy);
      setLocalPos({ x: finalX, y: finalY });
      onDragEnd(stamp.id, finalX, finalY);
    }
  };

  // --- Обработчики изменения размера ---

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isResizing.current = true;
    resizeStartPointer.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { w: localSize.w, h: localSize.h };
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing.current) return;
    e.stopPropagation();
    const dw = e.clientX - resizeStartPointer.current.x;
    const dh = e.clientY - resizeStartPointer.current.y;
    setLocalSize({
      w: Math.max(60, resizeStartSize.current.w + dw),
      h: Math.max(30, resizeStartSize.current.h + dh),
    });
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing.current) return;
    e.stopPropagation();
    isResizing.current = false;
    const dw = e.clientX - resizeStartPointer.current.x;
    const dh = e.clientY - resizeStartPointer.current.y;
    const finalW = Math.max(60, resizeStartSize.current.w + dw);
    const finalH = Math.max(30, resizeStartSize.current.h + dh);
    setLocalSize({ w: finalW, h: finalH });
    onResizeEnd(stamp.id, finalW, finalH);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: localPos.x * 100 + '%',
        top: localPos.y * 100 + '%',
        width: localSize.w + 'px',
        height: localSize.h + 'px',
        cursor: isDragging.current ? 'grabbing' : 'grab',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Заголовочная панель — захватывает перетаскивание */}
      <div
        className="h-5 bg-primary/80 text-white text-xs flex items-center px-1.5 gap-1 rounded-t select-none"
        onPointerDown={handleDragPointerDown}
      >
        <span className="truncate flex-1 text-[10px]">стр. {stamp.page + 1}</span>

        {/* Обёртка меню предотвращает начало перетаскивания при открытии */}
        <div onPointerDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-4 w-4 ml-auto shrink-0 text-white hover:bg-white/20 hover:text-white">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(stamp)}>
                Редактировать текст
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(stamp.id)}
              >
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Тело штампа с текстом */}
      <div className="flex-1 bg-primary/10 border border-primary/30 rounded-b px-1.5 py-1 text-xs overflow-hidden"
        style={{ height: `calc(100% - 1.25rem)` }}
      >
        <span className="line-clamp-3 break-words">{stamp.stampText}</span>
      </div>

      {/* Ручка изменения размера в правом нижнем углу */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 8,
          height: 8,
          cursor: 'se-resize',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: 2,
        }}
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
      />
    </div>
  );
}
