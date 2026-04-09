'use client';

import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useElementByGuid, useElementDetail } from './useModelViewer';
import { GprLinkPanel } from './GprLinkPanel';
import { DocumentLinkPanel } from './DocumentLinkPanel';

interface Props {
  modelId: string;
  projectId: string;
  ifcGuid: string;
  onClose: () => void;
}

/** Таблица IFC PropertySets */
function PropertiesTab({ properties }: { properties: Record<string, Record<string, unknown>> | null }) {
  if (!properties || Object.keys(properties).length === 0) {
    return <p className="text-xs text-muted-foreground">Свойства не загружены (IFC-файл не распарсен)</p>;
  }
  return (
    <div className="space-y-3">
      {Object.entries(properties).map(([psetName, props]) => (
        <div key={psetName}>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">{psetName}</p>
          <table className="w-full text-xs">
            <tbody>
              {Object.entries(props).map(([key, val]) => (
                <tr key={key} className="border-b border-muted/30">
                  <td className="py-0.5 pr-2 text-muted-foreground">{key}</td>
                  <td className="py-0.5 font-mono">{String(val ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export function ElementPropertiesPanel({ modelId, projectId, ifcGuid, onClose }: Props) {
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
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-x-2 text-xs">
                    <span className="text-muted-foreground">Тип IFC</span>
                    <span className="font-mono">{element.ifcType}</span>
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
                  <div className="border-t pt-2">
                    <PropertiesTab properties={element.properties} />
                  </div>
                </div>
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
