'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Search, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CollisionResultsList } from './CollisionResultsList';
import { useCollisions } from './useCollisions';
import type { CollisionType } from './useCollisions';

const ALL_IFC_TYPES = [
  'IfcWall', 'IfcSlab', 'IfcColumn', 'IfcBeam',
  'IfcDoor', 'IfcWindow', 'IfcOpeningElement',
  'IfcSpace', 'IfcBuildingElementProxy',
];
const DEFAULT_EXCLUDED = ['IfcOpeningElement', 'IfcSpace', 'IfcBuildingElementProxy'];

interface Props {
  projectId: string;
  modelId: string;
  onHighlight: (guidA: string, guidB: string) => void;
}

export function CollisionDetector({ projectId, modelId, onHighlight }: Props) {
  const [collisionType, setCollisionType] = useState<CollisionType>('intersection');
  const [toleranceMm, setToleranceMm] = useState<number>(10);
  const [excludedTypes, setExcludedTypes] = useState<string[]>(DEFAULT_EXCLUDED);
  const [exclusionsOpen, setExclusionsOpen] = useState(false);

  const { clashState, detect, clear } = useCollisions(projectId, modelId);

  const isDetecting = clashState.status === 'processing';

  const handleDetect = () => {
    detect({ collisionType, toleranceMm, excludedTypes });
  };

  const toggleType = (type: string) => {
    setExcludedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
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
          onChange={e => {
            const val = parseFloat(e.target.value);
            setToleranceMm(isNaN(val) ? 0 : Math.max(0, val));
          }}
          className="h-8 w-32 text-sm"
          placeholder="10"
        />
      </div>

      {/* Исключения по IfcType */}
      <Collapsible open={exclusionsOpen} onOpenChange={setExclusionsOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${exclusionsOpen ? 'rotate-180' : ''}`}
            />
            Исключения по IfcType
            {excludedTypes.length > 0 && (
              <span className="ml-1 rounded bg-muted px-1 text-[10px]">
                {excludedTypes.length}
              </span>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-1.5">
          {ALL_IFC_TYPES.map(type => (
            <div key={type} className="flex items-center gap-2">
              <Checkbox
                id={`exc-${type}`}
                checked={excludedTypes.includes(type)}
                onCheckedChange={() => toggleType(type)}
              />
              <Label htmlFor={`exc-${type}`} className="cursor-pointer font-mono text-xs">
                {type}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Кнопки */}
      <div className="flex gap-2">
        <Button
          onClick={handleDetect}
          disabled={isDetecting}
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

        {(clashState.results.length > 0 || clashState.status === 'error') && (
          <Button variant="outline" size="sm" onClick={clear} className="gap-1">
            <X className="h-3.5 w-3.5" />
            Сброс
          </Button>
        )}
      </div>

      {clashState.status === 'processing' && (
        <p className="text-xs text-muted-foreground">
          Идёт анализ на сервере, это может занять несколько минут...
        </p>
      )}

      {clashState.status === 'error' && (
        <p className="text-xs text-destructive">
          Ошибка при обнаружении коллизий. Попробуйте ещё раз.
        </p>
      )}

      {/* Результаты */}
      {(clashState.results.length > 0 || clashState.status === 'done') && (
        <CollisionResultsList results={clashState.results} onHighlight={onHighlight} />
      )}
    </div>
  );
}
