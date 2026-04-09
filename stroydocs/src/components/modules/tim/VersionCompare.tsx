'use client';

import { GitCompare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { VersionDiffViewer } from './VersionDiffViewer';
import { useVersionCompare } from './useVersionCompare';
import { useModels } from './useModels';

interface Props {
  projectId: string;
}

export function VersionCompare({ projectId }: Props) {
  const modelsQuery = useModels(projectId);
  const models = (modelsQuery.data ?? []).filter((m) => m.status === 'READY');

  const {
    modelIdA,
    setModelIdA,
    modelIdB,
    setModelIdB,
    canCompare,
    result,
    isPending,
    runCompare,
    reset,
  } = useVersionCompare(projectId);

  const handleModelAChange = (value: string) => {
    setModelIdA(value);
    reset();
  };

  const handleModelBChange = (value: string) => {
    setModelIdB(value);
    reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <GitCompare className="h-4 w-4" />
        Сравнение версий моделей
      </div>

      {/* Выбор двух моделей */}
      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="model-a">Модель A (базовая)</Label>
          <Select value={modelIdA ?? ''} onValueChange={handleModelAChange}>
            <SelectTrigger id="model-a">
              <SelectValue placeholder="Выберите модель..." />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id} disabled={m.id === modelIdB}>
                  {m.name}
                  {m.section ? ` · ${m.section.name}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="model-b">Модель B (сравниваемая)</Label>
          <Select value={modelIdB ?? ''} onValueChange={handleModelBChange}>
            <SelectTrigger id="model-b">
              <SelectValue placeholder="Выберите модель..." />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id} disabled={m.id === modelIdA}>
                  {m.name}
                  {m.section ? ` · ${m.section.name}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={runCompare}
        disabled={!canCompare || isPending}
        className="w-full gap-2"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GitCompare className="h-4 w-4" />
        )}
        {isPending ? 'Сравнение...' : 'Сравнить модели'}
      </Button>

      {/* Результат сравнения */}
      {result && (
        <div className="rounded-md border p-3">
          <p className="mb-3 text-xs text-muted-foreground">
            <span className="font-medium">{result.modelA.name}</span>
            {' → '}
            <span className="font-medium">{result.modelB.name}</span>
          </p>
          <VersionDiffViewer
            modelAName={result.modelA.name}
            modelBName={result.modelB.name}
            diff={result.diff}
          />
        </div>
      )}

      {models.length === 0 && !modelsQuery.isLoading && (
        <p className="text-center text-sm text-muted-foreground">
          Нет готовых моделей для сравнения. Загрузите хотя бы две модели.
        </p>
      )}
    </div>
  );
}
