'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { ExecutionDocsTable } from '@/components/modules/execution-docs/ExecutionDocsTable';
import { IdCategoryTree } from '@/components/modules/execution-docs/IdCategoryTree';
import { Ks2Table } from '@/components/modules/ks2/Ks2Table';
import { IdAnalyticsView } from '@/components/modules/execution-docs/IdAnalyticsView';
import { IdRegistriesView } from '@/components/modules/execution-docs/IdRegistriesView';
import { IdClosureView } from '@/components/modules/execution-docs/IdClosureView';
import { BatchXmlExportButton } from '@/components/modules/execution-docs/BatchXmlExportButton';
import { useObjectContracts } from './useObjectContracts';

interface Props {
  objectId: string;
}

// Модуль ИД — агрегирует исполнительную документацию по всем договорам объекта.
// Вкладки: АОСР/ОЖР | КС-2/КС-3 | Аналитика | Реестры | Закрывающий пакет
export function ObjectIdModule({ objectId }: Props) {
  const { contracts, isLoading } = useObjectContracts(objectId);
  const [contractId, setContractId] = useState<string>('');
  // Активная категория ИД для фильтрации таблицы документов (null = все)
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // Устанавливаем первый договор по умолчанию когда данные загружены
  const selectedContractId = contractId || contracts[0]?.id || '';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Исполнительная документация" />
        {contracts.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-muted-foreground">Договор:</span>
            <Select
              value={selectedContractId}
              onValueChange={setContractId}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Выберите договор" />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.number} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <BatchXmlExportButton projectId={objectId} contractId={selectedContractId} />
          </div>
        )}
      </div>

      <Tabs defaultValue="docs">
        <TabsList className="flex-wrap">
          <TabsTrigger value="docs">АОСР / ОЖР</TabsTrigger>
          <TabsTrigger value="ks2">КС-2 / КС-3</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          <TabsTrigger value="registries">Реестры</TabsTrigger>
          <TabsTrigger value="closure">Закрывающий пакет</TabsTrigger>
        </TabsList>

        <TabsContent value="docs" className="mt-4">
          {selectedContractId ? (
            <div className="flex min-h-[400px] rounded-lg border overflow-hidden">
              <IdCategoryTree
                projectId={objectId}
                activeId={categoryId}
                onSelect={setCategoryId}
              />
              <div className="flex-1 min-w-0 p-4">
                <ExecutionDocsTable
                  contractId={selectedContractId}
                  projectId={objectId}
                  categoryId={categoryId}
                />
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-muted-foreground">
              У объекта нет договоров. Создайте договор в разделе «Паспорт».
            </p>
          )}
        </TabsContent>

        <TabsContent value="ks2" className="mt-4">
          {selectedContractId ? (
            <Ks2Table
              projectId={objectId}
              contractId={selectedContractId}
            />
          ) : (
            <p className="py-12 text-center text-muted-foreground">
              У объекта нет договоров. Создайте договор в разделе «Паспорт».
            </p>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <IdAnalyticsView objectId={objectId} />
        </TabsContent>

        <TabsContent value="registries" className="mt-4">
          {selectedContractId ? (
            <IdRegistriesView objectId={objectId} contractId={selectedContractId} />
          ) : (
            <p className="py-12 text-center text-muted-foreground">
              У объекта нет договоров. Создайте договор в разделе «Паспорт».
            </p>
          )}
        </TabsContent>

        <TabsContent value="closure" className="mt-4">
          <IdClosureView objectId={objectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
