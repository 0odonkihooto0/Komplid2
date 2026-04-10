'use client';

import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useSEDDocumentCard } from './useSEDDocumentCard';
import { SEDDocHeader } from './SEDDocHeader';
import { SEDWorkflowRibbon } from './SEDWorkflowRibbon';
import { SEDInfoTab } from './SEDInfoTab';
import { SEDParamsTab } from './SEDParamsTab';
import { SEDSigningTab } from './SEDSigningTab';
import { SEDLinksTab } from './SEDLinksTab';
import { SEDBasesTab } from './SEDBasesTab';
import { SEDDocSidebar } from './SEDDocSidebar';

interface SEDDocumentCardProps {
  objectId: string;
  docId: string;
}

export function SEDDocumentCard({ objectId, docId }: SEDDocumentCardProps) {
  const router = useRouter();
  const {
    doc,
    isLoading,
    activeTab,
    setActiveTab,
    activeWorkflowId,
    setActiveWorkflowId,
    patchMutation,
    startWorkflowMutation,
    addLinkMutation,
  } = useSEDDocumentCard(objectId, docId);

  const handleClose = () => router.push(`/objects/${objectId}/sed`);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-2/3" />
        <div className="flex gap-6 mt-4">
          <div className="flex-1 space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
          <div className="w-[280px] space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Документ не найден</p>
        <Button variant="link" onClick={handleClose}>← Вернуться к списку</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <SEDDocHeader
        doc={doc}
        objectId={objectId}
        onClose={handleClose}
        isPatchPending={patchMutation.isPending}
        isWorkflowPending={startWorkflowMutation.isPending}
        onPatchStatus={(status) => patchMutation.mutate({ status })}
        onStartWorkflow={() => startWorkflowMutation.mutate()}
      />
      {doc.workflows.length > 0 && (
        <SEDWorkflowRibbon
          workflows={doc.workflows}
          activeWorkflowId={activeWorkflowId}
          onSelect={setActiveWorkflowId}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="info">Информация</TabsTrigger>
              <TabsTrigger value="params">Параметры</TabsTrigger>
              <TabsTrigger value="signing">Подписание</TabsTrigger>
              <TabsTrigger value="links">Связи</TabsTrigger>
              <TabsTrigger value="bases">Основания</TabsTrigger>
            </TabsList>
            <TabsContent value="info">
              <SEDInfoTab doc={doc} />
            </TabsContent>
            <TabsContent value="params">
              <SEDParamsTab doc={doc} />
            </TabsContent>
            <TabsContent value="signing">
              <SEDSigningTab
                doc={doc}
                objectId={objectId}
                docId={docId}
                onStartWorkflow={() => startWorkflowMutation.mutate()}
                isWorkflowPending={startWorkflowMutation.isPending}
              />
            </TabsContent>
            <TabsContent value="links">
              <SEDLinksTab
                doc={doc}
                objectId={objectId}
                docId={docId}
                addLinkMutation={addLinkMutation}
              />
            </TabsContent>
            <TabsContent value="bases">
              <SEDBasesTab doc={doc} />
            </TabsContent>
          </Tabs>
        </div>
        <div className="w-[280px] shrink-0 border-l overflow-y-auto">
          <SEDDocSidebar doc={doc} objectId={objectId} />
        </div>
      </div>
    </div>
  );
}
