'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useInspection, useCompleteInspection } from './useInspections';
import { InspectionInfoTab } from './InspectionInfoTab';
import { InspectionDefectsTab } from './InspectionDefectsTab';
import { InspectionPrescriptionsTab } from './InspectionPrescriptionsTab';
import { InspectionActTab } from './InspectionActTab';
import { InspectionFilesTab } from './InspectionFilesTab';
import { InspectionRemediationsTab } from './InspectionRemediationsTab';
import { CompleteInspectionDialog } from './CompleteInspectionDialog';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активна',
  COMPLETED: 'Завершена',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary'> = {
  ACTIVE: 'default',
  COMPLETED: 'secondary',
};

interface Props {
  objectId: string;
  inspectionId: string;
}

export function InspectionCard({ objectId, inspectionId }: Props) {
  const router = useRouter();
  const { data: inspection, isLoading } = useInspection(objectId, inspectionId);
  const complete = useCompleteInspection(objectId, inspectionId);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-6 text-muted-foreground">Проверка не найдена</div>
    );
  }

  const isActive = inspection.status === 'ACTIVE';

  return (
    <div className="space-y-4 p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/objects/${objectId}/sk/inspections`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">Проверка №{inspection.number}</h2>
          <Badge variant={STATUS_VARIANTS[inspection.status] ?? 'outline'}>
            {STATUS_LABELS[inspection.status] ?? inspection.status}
          </Badge>
        </div>

        {isActive && (
          <Button
            variant="destructive"
            onClick={() => setCompleteDialogOpen(true)}
          >
            Завершить проверку
          </Button>
        )}
      </div>

      {/* Вкладки */}
      <Tabs defaultValue="info">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="info">Информация</TabsTrigger>
          <TabsTrigger value="defects">
            Недостатки ({inspection.defects.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            Предписания ({inspection.prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="act">
            Акт проверки ({inspection.inspectionActs.length})
          </TabsTrigger>
          <TabsTrigger value="files">
            Файлы ({(inspection.attachmentS3Keys ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="remediations">
            Акты устранения ({inspection.remediationActs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <InspectionInfoTab inspection={inspection} objectId={objectId} />
        </TabsContent>

        <TabsContent value="defects">
          <InspectionDefectsTab
            inspection={inspection}
            objectId={objectId}
            inspectionId={inspectionId}
          />
        </TabsContent>

        <TabsContent value="prescriptions">
          <InspectionPrescriptionsTab prescriptions={inspection.prescriptions} objectId={objectId} />
        </TabsContent>

        <TabsContent value="act">
          <InspectionActTab
            acts={inspection.inspectionActs}
            objectId={objectId}
            inspectionStatus={inspection.status}
          />
        </TabsContent>

        <TabsContent value="files">
          <InspectionFilesTab objectId={objectId} inspectionId={inspectionId} />
        </TabsContent>

        <TabsContent value="remediations">
          <InspectionRemediationsTab remediationActs={inspection.remediationActs} objectId={objectId} />
        </TabsContent>
      </Tabs>

      <CompleteInspectionDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        inspection={inspection}
        objectId={objectId}
        inspectionId={inspectionId}
        onComplete={() => complete.mutate()}
        isLoading={complete.isPending}
      />
    </div>
  );
}
