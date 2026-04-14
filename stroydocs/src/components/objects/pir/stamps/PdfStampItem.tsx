'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pencil, Move, Maximize2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  // Состояние hover-панели и режимов
  const [isHovered, setIsHovered] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [isResizeMode, setIsResizeMode] = useState(false);

  // Refs для перетаскивания
  const isDragging = useRef(false);
  const dragStartPointer = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Refs для изменения размера
  const isResizing = useRef(false);
  const resizeStartPointer = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ w: 0, h: 0 });
  // Направление ресайза: se | sw | ne | nw
  const resizeDirection = useRef<'se' | 'sw' | 'ne' | 'nw'>('se');

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

  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    dir: 'se' | 'sw' | 'ne' | 'nw',
  ) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isResizing.current = true;
    resizeDirection.current = dir;
    resizeStartPointer.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { w: localSize.w, h: localSize.h };
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing.current) return;
    e.stopPropagation();
    const dw = e.clientX - resizeStartPointer.current.x;
    const dh = e.clientY - resizeStartPointer.current.y;
    // Для левых ручек (sw, nw) дельта ширины инвертирована
    const wSign = resizeDirection.current === 'sw' || resizeDirection.current === 'nw' ? -1 : 1;
    // Для верхних ручек (ne, nw) дельта высоты инвертирована
    const hSign = resizeDirection.current === 'ne' || resizeDirection.current === 'nw' ? -1 : 1;
    setLocalSize({
      w: Math.max(60, resizeStartSize.current.w + dw * wSign),
      h: Math.max(30, resizeStartSize.current.h + dh * hSign),
    });
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing.current) return;
    e.stopPropagation();
    isResizing.current = false;
    const dw = e.clientX - resizeStartPointer.current.x;
    const dh = e.clientY - resizeStartPointer.current.y;
    const wSign = resizeDirection.current === 'sw' || resizeDirection.current === 'nw' ? -1 : 1;
    const hSign = resizeDirection.current === 'ne' || resizeDirection.current === 'nw' ? -1 : 1;
    const finalW = Math.max(60, resizeStartSize.current.w + dw * wSign);
    const finalH = Math.max(30, resizeStartSize.current.h + dh * hSign);
    setLocalSize({ w: finalW, h: finalH });
    onResizeEnd(stamp.id, finalW, finalH);
  };

  /** Стили ручки ресайза */
  const resizeHandle = (
    dir: 'se' | 'sw' | 'ne' | 'nw',
    pos: { bottom?: number; top?: number; left?: number; right?: number },
  ) => (
    <div
      style={{
        position: 'absolute',
        width: 10,
        height: 10,
        backgroundColor: 'rgba(37,99,235,0.7)',
        borderRadius: 2,
        cursor: `${dir}-resize`,
        ...pos,
      }}
      onPointerDown={(e) => handleResizePointerDown(e, dir)}
      onPointerMove={handleResizePointerMove}
      onPointerUp={handleResizePointerUp}
    />
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: localPos.x * 100 + '%',
        top: localPos.y * 100 + '%',
        width: localSize.w + 'px',
        height: localSize.h + 'px',
        cursor: isDragging.current ? 'grabbing' : isDragMode ? 'grab' : 'default',
        // Не обрезаем hover-панель которая торчит сверху
        overflow: 'visible',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        // Не скрываем панель во время активного перетаскивания или ресайза
        if (!isDragging.current && !isResizing.current) {
          setIsHovered(false);
        }
      }}
    >
      {/* Плавающая контекстная панель — показывается при hover */}
      {isHovered && (
        <div
          className="absolute flex gap-0.5 bg-white border border-gray-200 rounded shadow-md p-0.5 z-50"
          style={{ top: -34, left: 0, whiteSpace: 'nowrap' }}
          // Предотвращаем скрытие панели при наведении на неё
          onMouseEnter={() => setIsHovered(true)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={() => onEdit(stamp)}
          >
            <Pencil className="h-3 w-3" />
            Редактировать
          </Button>
          <Button
            variant={isDragMode ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={() => {
              setIsDragMode((v) => !v);
              setIsResizeMode(false);
            }}
          >
            <Move className="h-3 w-3" />
            Передвинуть
          </Button>
          <Button
            variant={isResizeMode ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={() => {
              setIsResizeMode((v) => !v);
              setIsDragMode(false);
            }}
          >
            <Maximize2 className="h-3 w-3" />
            Изменить размер
          </Button>
          <div className="w-px bg-gray-200 mx-0.5" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1 text-destructive hover:text-destructive"
            onClick={() => onDelete(stamp.id)}
          >
            <Trash2 className="h-3 w-3" />
            Удалить
          </Button>
        </div>
      )}

      {/* Заголовочная панель — захватывает перетаскивание */}
      <div
        className={`h-5 text-white text-xs flex items-center px-1.5 gap-1 rounded-t select-none ${
          isDragMode ? 'bg-blue-600' : 'bg-primary/80'
        }`}
        onPointerDown={handleDragPointerDown}
        style={{ cursor: isDragMode ? 'grab' : 'default' }}
      >
        <span className="truncate flex-1 text-[10px]">стр. {stamp.page + 1}</span>

        {/* Обёртка меню предотвращает начало перетаскивания при открытии */}
        <div onPointerDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-auto shrink-0 text-white hover:bg-white/20 hover:text-white"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(stamp)}>
                <Pencil className="h-3 w-3 mr-2" />
                Редактировать текст
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setIsDragMode((v) => !v);
                  setIsResizeMode(false);
                }}
              >
                <Move className="h-3 w-3 mr-2" />
                {isDragMode ? 'Выйти из режима перемещения' : 'Передвинуть'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setIsResizeMode((v) => !v);
                  setIsDragMode(false);
                }}
              >
                <Maximize2 className="h-3 w-3 mr-2" />
                {isResizeMode ? 'Скрыть ручки ресайза' : 'Изменить размер'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(stamp.id)}
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Тело штампа с текстом */}
      <div
        className="flex-1 bg-primary/10 border border-primary/30 rounded-b px-1.5 py-1 text-xs overflow-hidden"
        style={{ height: `calc(100% - 1.25rem)` }}
      >
        <span className="line-clamp-3 break-words">{stamp.stampText}</span>
      </div>

      {/* Ручки изменения размера — всегда se + остальные только в режиме ресайза */}
      {resizeHandle('se', { bottom: 0, right: 0 })}
      {isResizeMode && (
        <>
          {resizeHandle('sw', { bottom: 0, left: 0 })}
          {resizeHandle('ne', { top: 0, right: 0 })}
          {resizeHandle('nw', { top: 0, left: 0 })}
        </>
      )}
    </div>
  );
}
