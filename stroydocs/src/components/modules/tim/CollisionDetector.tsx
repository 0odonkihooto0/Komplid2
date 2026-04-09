'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CollisionResultsList } from './CollisionResultsList';
import type { CollisionResult, CollisionType } from './useCollisions';
import type { ViewerScene } from './ifcSceneSetup';

interface Props {
  /** Сцена Three.js (null — если модель ещё не загружена) */
  scene: ViewerScene | null;
  results: CollisionResult[];
  isDetecting: boolean;
  onDetect: (scene: ViewerScene, type: CollisionType, toleranceMm: number) => Promise<void>;
  onClear: () => void;
  /** Подсветить пару элементов по expressID */
  onHighlight: (expressIdA: number, expressIdB: number) => void;
}

export function CollisionDetector({
  scene,
  results,
  isDetecting,
  onDetect,
  onClear,
  onHighlight,
}: Props) {
  const [collisionType, setCollisionType] = useState<CollisionType>('intersection');
  const [toleranceMm, setToleranceMm] = useState<number>(0);

  const handleDetect = async () => {
    if (!scene) return;
    await onDetect(scene, collisionType, toleranceMm);
  };

  const handleToleranceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setToleranceMm(isNaN(val) ? 0 : Math.max(0, val));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <AlertTriangle className="h-4 w-4" />
        Обнаружение коллизий
      </div>

      {/* Тип проверки */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Тип проверки</Label>
        <RadioGroup
          value={collisionType}
          onValueChange={(v: string) => setCollisionType(v as CollisionType)}
          className="space-y-1.5"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="intersection" id="col-intersection" />
            <Label htmlFor="col-intersection" className="cursor-pointer text-sm">
              Пересечение геометрии
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="duplicate" id="col-duplicate" />
            <Label htmlFor="col-duplicate" className="cursor-pointer text-sm">
              Дублирование элементов
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Допуск */}
      <div className="space-y-1.5">
        <Label htmlFor="tolerance" className="text-xs text-muted-foreground">
          Допуск (мм)
        </Label>
        <Input
          id="tolerance"
          type="number"
          min="0"
          step="1"
          value={toleranceMm}
          onChange={handleToleranceChange}
          className="h-8 w-32 text-sm"
          placeholder="0"
        />
      </div>

      {/* Кнопки */}
      <div className="flex gap-2">
        <Button
          onClick={handleDetect}
          disabled={!scene || isDetecting}
          className="flex-1 gap-2"
          size="sm"
        >
          {isDetecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {isDetecting ? 'Анализ...' : 'Найти коллизии'}
        </Button>

        {results.length > 0 && (
          <Button variant="outline" size="sm" onClick={onClear} className="gap-1">
            <X className="h-3.5 w-3.5" />
            Сброс
          </Button>
        )}
      </div>

      {!scene && (
        <p className="text-xs text-muted-foreground">
          Дождитесь загрузки модели в 3D-вьюере
        </p>
      )}

      {/* Результаты */}
      {results.length > 0 || (!isDetecting && scene) ? (
        <CollisionResultsList results={results} onHighlight={onHighlight} />
      ) : null}
    </div>
  );
}
