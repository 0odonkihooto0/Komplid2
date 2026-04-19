'use client';

import { useQuery } from '@tanstack/react-query';
import { Box, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BimModelStage } from '@prisma/client';

interface BimElementInfo {
  id: string;
  ifcGuid: string;
  name: string;
  ifcType: string;
  level: string | null;
}

interface BimModelInfo {
  id: string;
  name: string;
  stage: BimModelStage | null;
}

interface TimLink {
  id: string;
  elementId: string;
  modelId: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  model: BimModelInfo;
  element: BimElementInfo;
}

interface ApiResponse {
  success: boolean;
  data: { data: TimLink[]; count: number };
}

interface Props {
  projectId: string;
  docId: string;
}

const STAGE_LABELS: Record<string, string> = {
  OTR: 'ОТР',
  PROJECT: 'Проектная ДОК',
  WORKING: 'Рабочая ДОК',
  CONSTRUCTION: 'В производство',
};

export function DesignDocTimTab({ projectId, docId }: Props) {
  const { data, isLoading } = useQuery<{ data: TimLink[]; count: number }>({
    queryKey: ['design-doc-tim-links', docId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/design-docs/${docId}/tim-links`
      );
      if (!res.ok) throw new Error('Ошибка загрузки ТИМ-связей');
      const json: ApiResponse = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  const links = data?.data ?? [];

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-14 text-center">
        <Box className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">
          Нет связанных BIM-элементов
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Доступно после подключения модуля ТИМ и привязки элементов
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => window.location.assign(`/objects/${projectId}/tim`)}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Перейти в модуль ТИМ
        </Button>
      </div>
    );
  }

  // Группируем по модели
  const byModel = links.reduce<Record<string, { model: BimModelInfo; elements: BimElementInfo[] }>>(
    (acc, link) => {
      if (!acc[link.modelId]) {
        acc[link.modelId] = { model: link.model, elements: [] };
      }
      acc[link.modelId].elements.push(link.element);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Связано BIM-элементов: <span className="font-medium text-foreground">{links.length}</span>
      </p>
      {Object.values(byModel).map(({ model, elements }) => (
        <div key={model.id} className="overflow-hidden rounded-md border">
          <div className="flex items-center justify-between bg-muted/50 px-4 py-2.5">
            <span className="text-sm font-medium">{model.name}</span>
            {model.stage && (
              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                {STAGE_LABELS[model.stage] ?? model.stage}
              </span>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Тип IFC</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Наименование</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Уровень</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {elements.map((el) => (
                <tr key={el.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{el.ifcType}</td>
                  <td className="px-4 py-2">{el.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{el.level ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
