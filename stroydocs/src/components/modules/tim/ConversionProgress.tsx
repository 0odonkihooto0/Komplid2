'use client';

import { Loader2, RefreshCw, RotateCw, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Состояние BIM-модели с точки зрения UI-вьюера */
export type ConversionUiState =
  | 'PROCESSING' // Парсинг IFC
  | 'CONVERTING' // Конвертация IFC → GLB
  | 'ERROR' // Ошибка (parseError или convertError)
  | 'FALLBACK'; // Слишком долго висим → показать структуру без 3D

interface Props {
  state: ConversionUiState;
  /** Сколько секунд прошло с момента открытия вьюера */
  elapsedSec: number;
  /** Сообщение об ошибке из metadata.convertError */
  errorMessage?: string | null;
  /** Перезагрузить страницу (всегда видна в CONVERTING) */
  onReload: () => void;
  /** Перезапустить конвертацию через POST /reconvert (CONVERTING/ERROR/FALLBACK) */
  onReconvert: () => void;
  /** Идёт ли запрос на /reconvert (блокирует кнопку) */
  reconverting: boolean;
}

/** Форматирование секунд → mm:ss для таймера */
function formatElapsed(sec: number): string {
  const mm = Math.floor(sec / 60).toString().padStart(2, '0');
  const ss = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Экран прогресса конвертации + fallback-заглушка.
 * Показывается поверх области 3D-вьюера пока модель не готова (или в fallback-режиме).
 *
 * Ключевой UX-принцип: кнопка «Обновить страницу» видна ВСЕГДА (не прячется через 30с) —
 * пользователь не должен гадать как выбраться из зависшего экрана.
 */
export function ConversionProgress({
  state,
  elapsedSec,
  errorMessage,
  onReload,
  onReconvert,
  reconverting,
}: Props) {
  // ─── FALLBACK: 3D недоступен (>10 минут или ошибка) ─────────────────────────
  if (state === 'FALLBACK') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 p-6">
        <Info className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">3D-просмотр временно недоступен</p>
        <p className="max-w-md text-center text-xs text-muted-foreground">
          Данные модели загружены — используйте левую панель для навигации по структуре
          и правую панель для просмотра свойств элементов. Можно работать с ГПР-привязками.
        </p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={onReload}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Обновить страницу
          </Button>
          <Button size="sm" onClick={onReconvert} disabled={reconverting}>
            <RotateCw className={`mr-2 h-3.5 w-3.5 ${reconverting ? 'animate-spin' : ''}`} />
            Перезапустить конвертацию
          </Button>
        </div>
      </div>
    );
  }

  // ─── ERROR: показать сообщение + кнопка Reconvert ───────────────────────────
  if (state === 'ERROR') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 p-6">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium text-destructive">Ошибка конвертации модели</p>
        {errorMessage && (
          <p className="max-w-md text-center text-xs text-muted-foreground break-words">
            {errorMessage}
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={onReload}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Обновить страницу
          </Button>
          <Button size="sm" onClick={onReconvert} disabled={reconverting}>
            <RotateCw className={`mr-2 h-3.5 w-3.5 ${reconverting ? 'animate-spin' : ''}`} />
            Перезапустить конвертацию
          </Button>
        </div>
      </div>
    );
  }

  // ─── PROCESSING / CONVERTING: прогресс-экран с таймером ─────────────────────
  const isConverting = state === 'CONVERTING';
  const title = isConverting ? 'Конвертация модели в glTF…' : 'Парсинг IFC-файла…';
  const hint = isConverting
    ? 'Это может занять 2–10 минут для больших моделей'
    : 'Идёт разбор элементов и свойств модели';

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/90 p-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>

      {/* Indeterminate progress bar (чисто визуальный) */}
      <div className="mt-1 h-1 w-64 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-[slide_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>

      <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
        Прошло: {formatElapsed(elapsedSec)}
      </p>

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={onReload}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Обновить страницу
        </Button>
        {isConverting && (
          <Button size="sm" variant="ghost" onClick={onReconvert} disabled={reconverting}>
            <RotateCw className={`mr-2 h-3.5 w-3.5 ${reconverting ? 'animate-spin' : ''}`} />
            Перезапустить
          </Button>
        )}
      </div>
    </div>
  );
}
