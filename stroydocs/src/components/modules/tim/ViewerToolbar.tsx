'use client';

import type { ComponentType } from 'react';
import {
  MousePointer2, Square, RotateCcw, Hand, Eye, EyeOff,
  Maximize2, Grid3X3, Ruler, Scissors, Layers, AlertTriangle,
  GitCompare, BoxSelect, Focus, Camera, Download, FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ViewerToolbarProps {
  onReset: () => void;
  onFit: () => void;
  onWireframe: () => void;
  wireframe: boolean;
  onCollisions?: () => void;
  onCompare?: () => void;
  collisionsActive?: boolean;
  compareActive?: boolean;
  onClipping?: () => void;
  clippingActive?: boolean;
  onMeasure?: () => void;
  measureActive?: boolean;
  onLayers?: () => void;
  layersActive?: boolean;
  onDownloadIfc?: () => void;
  onScreenshot?: () => void;
  /** Экспорт элементов в CSV (ifcType — фильтр по типу, undefined = все) */
  onExportCsv?: (ifcType?: string) => void;
  /** Выбрать все элементы */
  onSelectAll?: () => void;
  /** Показать только выбранные элементы */
  onShowSelected?: () => void;
  /** Скрыть выбранные элементы */
  onHideSelected?: () => void;
  /** Показать все элементы (сбросить видимость) */
  onShowAll?: () => void;
}

/** Кнопка тулбара с tooltip */
function TBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onClick}
          disabled={!onClick}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

const VSep = () => <Separator orientation="vertical" className="mx-1 h-6" />;

export function ViewerToolbar({
  onReset,
  onFit,
  onWireframe,
  wireframe,
  onCollisions,
  onCompare,
  collisionsActive,
  compareActive,
  onClipping,
  clippingActive,
  onMeasure,
  measureActive,
  onLayers,
  layersActive,
  onDownloadIfc,
  onScreenshot,
  onExportCsv,
  onSelectAll,
  onShowSelected,
  onHideSelected,
  onShowAll,
}: ViewerToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex shrink-0 items-center border-b bg-background px-2 py-1">
        {/* Группа 1: Выбор */}
        <TBtn icon={MousePointer2} label="Курсор" />
        <TBtn icon={Square} label="Рамка выбора" />

        <VSep />

        {/* Группа 2: Навигация */}
        <TBtn icon={RotateCcw} label="Вращение" onClick={onReset} />
        <TBtn icon={Hand} label="Панорама" />
        <TBtn icon={Eye} label="Взгляд вокруг" />

        <VSep />

        {/* Группа 3: Вид */}
        <TBtn icon={Maximize2} label="По размеру модели" onClick={onFit} />
        <TBtn icon={Grid3X3} label="Каркасный режим" active={wireframe} onClick={onWireframe} />

        <VSep />

        {/* Группа 4: Инструменты */}
        <TBtn icon={Ruler} label="Измерения" active={measureActive} onClick={onMeasure} />
        <TBtn icon={Scissors} label="Разрезы" active={clippingActive} onClick={onClipping} />
        <TBtn icon={Layers} label="Слои" active={layersActive} onClick={onLayers} />
        {onCollisions && (
          <TBtn icon={AlertTriangle} label="Коллизии" active={collisionsActive} onClick={onCollisions} />
        )}
        {onCompare && (
          <TBtn icon={GitCompare} label="Сравнение версий" active={compareActive} onClick={onCompare} />
        )}

        <VSep />

        {/* Группа 5: Выделение */}
        <TBtn icon={BoxSelect} label="Выбрать всё" onClick={onSelectAll} />
        <TBtn icon={Focus} label="Показать только выбранное" onClick={onShowSelected} />
        <TBtn icon={EyeOff} label="Скрыть выбранное" onClick={onHideSelected} />
        <TBtn icon={Eye} label="Показать всё" onClick={onShowAll} />

        <VSep />

        {/* Группа 6: Экспорт */}
        <TBtn icon={Camera} label="Скриншот" onClick={onScreenshot} />
        <TBtn icon={Download} label="Скачать IFC" onClick={onDownloadIfc} />
        {onExportCsv && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <FileSpreadsheet className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Экспорт данных</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onExportCsv()}>
                Все элементы (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExportCsv('IfcWall')}>
                Только стены (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExportCsv('IfcSlab')}>
                Только перекрытия (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  );
}
