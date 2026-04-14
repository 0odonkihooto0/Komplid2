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
import { BatchXmlExportButton } from '@/components/modules/execution-docs/BatchXmlExportButton';
import { CreateDocDropdown } from '@/components/modules/execution-docs/CreateDocDropdown';
import { useObjectContracts } from './useObjectContracts';

interface Props {
  objectId: string;
}

// Модуль ИД — агрегирует исполнительную документацию по всем договорам объекта.
// Вкладки: Все | КС | Акты | Общие документы | Счет-фактура | Аналитика | Реестры
export function ObjectIdModule({ objectId }: Props) {
  const { contracts, isLoading } = useObjectContracts(objectId);
  const [contractId, setContractId] = useState<string>('');
  // Активная категория ИД для фильтрации в табе «Все»
  const [categoryId, setCategoryId] = useState<string | null>(null);

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

  const noContracts = (
    <p className="py-12 text-center text-muted-foreground">
      У объекта нет договоров. Создайте договор в разделе «Паспорт».
    </p>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader title="Исполнительная документация" />
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {contracts.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">Договор:</span>
              <Select value={selectedContractId} onValueChange={setContractId}>
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
            </>
          )}
          <BatchXmlExportButton projectId={objectId} contractId={selectedContractId} />
          {selectedContractId && (
            <CreateDocDropdown
              contractId={selectedContractId}
              projectId={objectId}
            />
          )}
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Все</TabsTrigger>
          <TabsTrigger value="ks">КС</TabsTrigger>
          <TabsTrigger value="acts">Акты</TabsTrigger>
          <TabsTrigger value="general">Общие документы</TabsTrigger>
          <TabsTrigger value="invoice">Счет-фактура</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          <TabsTrigger value="registries">Реестры</TabsTrigger>
        </TabsList>

        {/* Все документы ИД (с деревом категорий) */}
        <TabsContent value="all" className="mt-4">
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
          ) : noContracts}
        </TabsContent>

        {/* КС: КС-2/КС-3 + акты КС (КС-6а, КС-11, КС-14) */}
        <TabsContent value="ks" className="mt-4 space-y-6">
          {selectedContractId ? (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">КС-2 / КС-3</h3>
                <Ks2Table projectId={objectId} contractId={selectedContractId} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Акты КС (КС-6а, КС-11, КС-14)</h3>
                <ExecutionDocsTable
                  contractId={selectedContractId}
                  projectId={objectId}
                  types={['KS_6A', 'KS_11', 'KS_14']}
                />
              </div>
            </>
          ) : noContracts}
        </TabsContent>

        {/* Акты: АОСР + АТГ */}
        <TabsContent value="acts" className="mt-4">
          {selectedContractId ? (
            <ExecutionDocsTable
              contractId={selectedContractId}
              projectId={objectId}
              types={['AOSR', 'TECHNICAL_READINESS_ACT']}
            />
          ) : noContracts}
        </TabsContent>

        {/* Общие документы */}
        <TabsContent value="general" className="mt-4">
          {selectedContractId ? (
            <ExecutionDocsTable
              contractId={selectedContractId}
              projectId={objectId}
              types={['GENERAL_DOCUMENT']}
            />
          ) : noContracts}
        </TabsContent>

        {/* Счет-фактура — placeholder */}
        <TabsContent value="invoice" className="mt-4">
          <p className="py-12 text-center text-muted-foreground">
            Функционал счёт-фактур находится в разработке.
          </p>
        </TabsContent>

        {/* Аналитика */}
        <TabsContent value="analytics" className="mt-4">
          <IdAnalyticsView objectId={objectId} />
        </TabsContent>

        {/* Реестры */}
        <TabsContent value="registries" className="mt-4">
          {selectedContractId ? (
            <IdRegistriesView objectId={objectId} contractId={selectedContractId} />
          ) : noContracts}
        </TabsContent>
      </Tabs>
    </div>
  );
}
