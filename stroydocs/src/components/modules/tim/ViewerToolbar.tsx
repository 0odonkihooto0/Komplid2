'use client';

import { Home, Maximize2, Grid3X3, AlertTriangle, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ViewerToolbarProps {
  onReset: () => void;
  onFit: () => void;
  onWireframe: () => void;
  wireframe: boolean;
  /** Открыть панель обнаружения коллизий */
  onCollisions?: () => void;
  /** Открыть панель сравнения версий */
  onCompare?: () => void;
  /** Подсветка активна — кнопка коллизий нажата */
  collisionsActive?: boolean;
  /** Сравнение активно — кнопка сравнения нажата */
  compareActive?: boolean;
}

export function ViewerToolbar({
  onReset,
  onFit,
  onWireframe,
  wireframe,
  onCollisions,
  onCompare,
  collisionsActive,
  compareActive,
}: ViewerToolbarProps) {
  return (
    <TooltipProvider>
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 shadow-md"
              onClick={onReset}
            >
              <Home className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Сбросить камеру</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 shadow-md"
              onClick={onFit}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">По размеру модели</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={wireframe ? 'default' : 'secondary'}
              size="icon"
              className="h-8 w-8 shadow-md"
              onClick={onWireframe}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Каркасный режим</TooltipContent>
        </Tooltip>

        {onCollisions && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={collisionsActive ? 'default' : 'secondary'}
                size="icon"
                className="h-8 w-8 shadow-md"
                onClick={onCollisions}
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Обнаружение коллизий</TooltipContent>
          </Tooltip>
        )}

        {onCompare && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={compareActive ? 'default' : 'secondary'}
                size="icon"
                className="h-8 w-8 shadow-md"
                onClick={onCompare}
              >
                <GitCompare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Сравнение версий</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
