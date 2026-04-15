'use client';

import { GitCompare, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { VersionDiffViewer } from './VersionDiffViewer';
import { useVersionCompare } from './useVersionCompare';

interface BimVersion {
  id: string;
  version: number;
  name: string;
  isCurrent: boolean;
}

interface Props {
  projectId: string;
  modelId: string;
  onHighlightByGuid?: (guid: string) => void;
}

export function VersionCompare({ projectId, modelId, onHighlightByGuid }: Props) {
  // Загружаем список версий через существующий GET /bim/models/[modelId]
  const modelQuery = useQuery<{ versions: BimVersion[] }>({
    queryKey: ['bim-model-versions', modelId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/bim/models/${modelId}`);
      const json = await res.json() as { success: boolean; data: { versions: BimVersion[] }; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки версий');
      return json.data;
    },
  });

  const versions = modelQuery.data?.versions ?? [];

  const {
    versionIdOld,
    setVersionIdOld,
    versionIdNew,
    setVersionIdNew,
    canCompare,
    result,
    isPending,
    runCompare,
    reset,
  } = useVersionCompare(projectId, modelId);

  const handleOldChange = (value: string) => {
    setVersionIdOld(value);
    reset();
  };

  const handleNewChange = (value: string) => {
    setVersionIdNew(value);
    reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <GitCompare className="h-4 w-4" />
        Сравнение версий (ifcdiff)
      </div>

      {/* Выбор двух версий */}
      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="version-old">Версия A (базовая)</Label>
          <Select value={versionIdOld ?? ''} onValueChange={handleOldChange}>
            <SelectTrigger id="version-old">
              <SelectValue placeholder="Выберите версию..." />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id} disabled={v.id === versionIdNew}>
                  <span>v{v.version} — {v.name}</span>
                  {v.isCurrent && (
                    <Badge variant="secondary" className="ml-2 text-xs">текущая</Badge>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="version-new">Версия B (новая)</Label>
          <Select value={versionIdNew ?? ''} onValueChange={handleNewChange}>
            <SelectTrigger id="version-new">
              <SelectValue placeholder="Выберите версию..." />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id} disabled={v.id === versionIdOld}>
                  <span>v{v.version} — {v.name}</span>
                  {v.isCurrent && (
                    <Badge variant="secondary" className="ml-2 text-xs">текущая</Badge>
                  )}
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
        {isPending ? 'Сравнение...' : 'Сравнить через ifcdiff'}
      </Button>

      {/* Результат сравнения */}
      {result && (
        <div className="rounded-md border p-3">
          <VersionDiffViewer diff={result} onHighlight={onHighlightByGuid} />
        </div>
      )}

      {versions.length < 2 && !modelQuery.isLoading && (
        <p className="text-center text-sm text-muted-foreground">
          Нет двух версий для сравнения. Загрузите хотя бы две версии модели.
        </p>
      )}
    </div>
  );
}
