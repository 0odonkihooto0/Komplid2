'use client';

import { useState, useMemo } from 'react';
import { X, Loader2, RefreshCw, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/useToast';
import { useElementByGuid, useElementDetail, type BimElementDetail } from './useModelViewer';
import { GprLinkPanel } from './GprLinkPanel';
import { DocumentLinkPanel } from './DocumentLinkPanel';

interface Props {
  modelId: string;
  projectId: string;
  ifcGuid: string;
  onClose: () => void;
  /** Выбранная версия ГПР (пробрасывается в GprLinkPanel) */
  selectedVersionId: string | null;
  onVersionChange: (id: string | null) => void;
  /** Callback «Следовать за работой»: подсветить все элементы привязанные к задаче */
  onFollowWork: (taskId: string) => void;
  /** Callback «Выделить на модели»: подсветить все элементы привязанные к документу/замечанию */
  onFollowDoc: (entityType: string, entityId: string) => void;
}

/** Один раскрываемый блок PropertySet */
function PsetAccordionItem({
  name,
  props,
  defaultOpen,
}: {
  name: string;
  props: Record<string, unknown>;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const entries = Object.entries(props);
  if (entries.length === 0) return null;

  return (
    <div className="border-b border-muted/30">
      <button
        className="flex w-full items-center gap-1 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        {open
          ? <ChevronDown className="h-3 w-3 shrink-0" />
          : <ChevronRight className="h-3 w-3 shrink-0" />}
        <span className="truncate">{name}</span>
        <span className="ml-auto shrink-0 text-[10px] tabular-nums">{entries.length}</span>
      </button>
      {open && (
        <div className="grid grid-cols-[100px_1fr] gap-y-0.5 pb-2 pl-4">
          {entries.map(([key, val]) => (
            <div key={key} className="contents">
              <span className="text-xs text-gray-500 truncate">{key}</span>
              <span className="text-xs text-gray-900 font-mono break-all">{String(val ?? '—')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Accordion PropertySets с поиском */
function PropertiesAccordion({
  properties,
  search,
}: {
  properties: Record<string, Record<string, unknown>>;
  search: string;
}) {
  const psets = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return Object.entries(properties);
    // Фильтрация по ключу или значению свойства
    return Object.entries(properties)
      .map(([psetName, props]) => {
        const filtered = Object.fromEntries(
          Object.entries(props).filter(
            ([key, val]) =>
              key.toLowerCase().includes(q) ||
              String(val ?? '').toLowerCase().includes(q) ||
              psetName.toLowerCase().includes(q)
          )
        );
        return [psetName, filtered] as [string, Record<string, unknown>];
      })
      .filter(([, props]) => Object.keys(props).length > 0);
  }, [properties, search]);

  if (psets.length === 0) {
    return <p className="py-2 text-xs text-muted-foreground">Свойства не найдены</p>;
  }

  return (
    <div>
      {psets.map(([psetName, props], idx) => (
        <PsetAccordionItem
          key={psetName}
          name={psetName}
          props={props}
          defaultOpen={idx === 0 && !search}
        />
      ))}
    </div>
  );
}

/** Кнопка загрузки PropertySets через IfcOpenShell-сервис для старых моделей (properties = null) */
function RefreshPropertiesButton({
  elementId,
  modelId,
  projectId,
}: {
  elementId: string;
  modelId: string;
  projectId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/bim/models/${modelId}/elements/${elementId}/refresh-properties`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        setError(json.error ?? 'Ошибка загрузки свойств');
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ['bim-element-detail', projectId, modelId, elementId],
      });
    } catch {
      setError('Сервис недоступен');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={handleRefresh}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="mr-1.5 h-3 w-3" />
        )}
        Загрузить свойства
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Вкладка «Информация»: базовые поля + accordion PropertySets + поиск + копировать GUID */
function InfoTab({
  element,
  ifcGuid,
  modelId,
  projectId,
}: {
  element: BimElementDetail;
  ifcGuid: string;
  modelId: string;
  projectId: string;
}) {
  const [propSearch, setPropSearch] = useState('');
  const { toast } = useToast();

  const properties = element.properties as Record<string, Record<string, unknown>> | null;

  const handleCopyGuid = async () => {
    try {
      await navigator.clipboard.writeText(ifcGuid);
      toast({ title: 'GUID скопирован' });
    } catch {
      toast({ title: 'Не удалось скопировать', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      {/* Базовая информация */}
      <div className="grid grid-cols-[100px_1fr] gap-y-1 text-xs">
        <span className="text-muted-foreground">GUID</span>
        <span className="flex items-center gap-1 font-mono">
          <span className="truncate">{ifcGuid}</span>
          <button
            onClick={handleCopyGuid}
            className="shrink-0 p-0.5 rounded hover:bg-gray-100 transition-colors"
            aria-label="Копировать GUID"
          >
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
        </span>

        <span className="text-muted-foreground">Тип IFC</span>
        <span className="font-mono">{element.ifcType}</span>

        {element.name && (
          <>
            <span className="text-muted-foreground">Имя</span>
            <span>{element.name}</span>
          </>
        )}

        {element.layer && (
          <>
            <span className="text-muted-foreground">Слой</span>
            <span>{element.layer}</span>
          </>
        )}

        {element.level && (
          <>
            <span className="text-muted-foreground">Уровень</span>
            <span>{element.level}</span>
          </>
        )}
      </div>

      {/* Поиск по свойствам + Accordion PropertySets */}
      <div className="border-t pt-2">
        {properties && Object.keys(properties).length > 0 ? (
          <>
            <Input
              value={propSearch}
              onChange={(e) => setPropSearch(e.target.value)}
              placeholder="Поиск свойств..."
              className="mb-2 h-7 text-xs"
            />
            <PropertiesAccordion properties={properties} search={propSearch} />
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Свойства не загружены (IFC-файл не распознан)
          </p>
        )}

        {/* Для старых моделей без properties — кнопка загрузки через IfcOpenShell */}
        {!properties && (
          <RefreshPropertiesButton
            elementId={element.id}
            modelId={modelId}
            projectId={projectId}
          />
        )}
      </div>
    </div>
  );
}

export function ElementPropertiesPanel({
  modelId,
  projectId,
  ifcGuid,
  onClose,
  selectedVersionId,
  onVersionChange,
  onFollowWork,
  onFollowDoc,
}: Props) {
  const { data: elemRef, isLoading: loadingRef } = useElementByGuid(projectId, modelId, ifcGuid);
  const { data: element, isLoading: loadingDetail } = useElementDetail(
    projectId,
    modelId,
    elemRef?.id ?? null
  );

  const isLoading = loadingRef || loadingDetail;

  return (
    <div className="flex w-80 shrink-0 flex-col border-l bg-background">
      {/* Заголовок */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{element?.name ?? element?.ifcType ?? 'Элемент'}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">{ifcGuid}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="info" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-3 mt-2 grid w-auto grid-cols-4 shrink-0">
            <TabsTrigger value="info" className="text-xs">Инфо</TabsTrigger>
            <TabsTrigger value="gpr" className="text-xs">ГПР</TabsTrigger>
            <TabsTrigger value="links" className="text-xs">Связи</TabsTrigger>
            <TabsTrigger value="files" className="text-xs">Файлы</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            <TabsContent value="info" className="mt-0">
              {element ? (
                <InfoTab
                  element={element}
                  ifcGuid={ifcGuid}
                  modelId={modelId}
                  projectId={projectId}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Элемент не найден в базе данных. Возможно, IFC-файл ещё не распарсен.
                </p>
              )}
            </TabsContent>

            <TabsContent value="gpr" className="mt-0">
              {element ? (
                <GprLinkPanel
                  elementId={element.id}
                  modelId={modelId}
                  projectId={projectId}
                  links={element.links}
                  selectedVersionId={selectedVersionId}
                  onVersionChange={onVersionChange}
                  onFollowWork={onFollowWork}
                />
              ) : (
                <p className="text-xs text-muted-foreground">Элемент не найден в БД</p>
              )}
            </TabsContent>

            <TabsContent value="links" className="mt-0">
              {element ? (
                <DocumentLinkPanel
                  elementId={element.id}
                  modelId={modelId}
                  projectId={projectId}
                  links={element.links}
                  onFollowDoc={onFollowDoc}
                />
              ) : (
                <p className="text-xs text-muted-foreground">Элемент не найден в БД</p>
              )}
            </TabsContent>

            <TabsContent value="files" className="mt-0">
              <p className="text-xs text-muted-foreground">
                Прикреплённые файлы будут добавлены в следующем шаге
              </p>
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}
