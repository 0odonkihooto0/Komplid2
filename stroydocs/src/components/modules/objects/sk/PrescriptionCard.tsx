'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/format';
import { usePrescription } from './usePrescriptions';
import { PrescriptionApprovalSection } from './PrescriptionApprovalSection';

const TYPE_LABELS: Record<string, string> = {
  DEFECT_ELIMINATION: 'Устранение недостатков',
  WORK_SUSPENSION: 'Приостановка работ',
};

const TYPE_VARIANTS: Record<string, 'default' | 'destructive'> = {
  DEFECT_ELIMINATION: 'default',
  WORK_SUSPENSION: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активно',
  CLOSED: 'Закрыто',
};

const DEFECT_CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION:    'Нарушение ОТ',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY:          'Пожарная безопасность',
  ECOLOGY:              'Экология',
  DOCUMENTATION:        'Документация',
  OTHER:                'Прочее',
};

const REMEDIATION_STATUS_LABELS: Record<string, string> = {
  DRAFT:          'Черновик',
  PENDING_REVIEW: 'На рассмотрении',
  ACCEPTED:       'Принят',
  REJECTED:       'Отклонён',
};

interface Props {
  objectId: string;
  prescriptionId: string;
}

export function PrescriptionCard({ objectId, prescriptionId }: Props) {
  const router = useRouter();
  const { data: prescription, isLoading } = usePrescription(objectId, prescriptionId);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!prescription) {
    return <div className="p-6 text-muted-foreground">Предписание не найдено</div>;
  }

  return (
    <div className="space-y-4 p-6">
      {/* Заголовок */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/objects/${objectId}/sk/prescriptions`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">Предписание №{prescription.number}</h2>
        <Badge variant={TYPE_VARIANTS[prescription.type] ?? 'outline'}>
          {TYPE_LABELS[prescription.type] ?? prescription.type}
        </Badge>
        <Badge variant={prescription.status === 'ACTIVE' ? 'default' : 'secondary'}>
          {STATUS_LABELS[prescription.status] ?? prescription.status}
        </Badge>
      </div>

      {/* Вкладки */}
      <Tabs defaultValue="info">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="info">Информация</TabsTrigger>
          <TabsTrigger value="defects">
            Недостатки ({prescription._count.defects})
          </TabsTrigger>
          <TabsTrigger value="remediations">
            Акты устранения ({prescription._count.remediationActs})
          </TabsTrigger>
          <TabsTrigger value="approval">Подписание</TabsTrigger>
        </TabsList>

        {/* Информация */}
        <TabsContent value="info" className="space-y-3 pt-4">
          <div className="grid gap-2 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-40 shrink-0">Проверка:</span>
              <button
                className="text-blue-600 hover:underline"
                onClick={() => router.push(`/objects/${objectId}/sk/inspections/${prescription.inspection.id}`)}
              >
                №{prescription.inspection.number}
              </button>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-40 shrink-0">Выдал:</span>
              <span>{prescription.issuedBy.lastName} {prescription.issuedBy.firstName}</span>
            </div>
            {prescription.responsible && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-40 shrink-0">Ответственный:</span>
                <span>{prescription.responsible.lastName} {prescription.responsible.firstName}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-muted-foreground w-40 shrink-0">Дата выдачи:</span>
              <span>{formatDate(prescription.issuedAt)}</span>
            </div>
            {prescription.deadline && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-40 shrink-0">Срок устранения:</span>
                <span>{formatDate(prescription.deadline)}</span>
              </div>
            )}
            {prescription.closedAt && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-40 shrink-0">Закрыто:</span>
                <span>{formatDate(prescription.closedAt)}</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Дефекты */}
        <TabsContent value="defects" className="pt-4">
          {prescription.defects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Недостатки не привязаны</p>
          ) : (
            <div className="space-y-2">
              {prescription.defects.map((d) => (
                <div key={d.id} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{d.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {DEFECT_CATEGORY_LABELS[d.category] ?? d.category}
                    </Badge>
                  </div>
                  {d.deadline && (
                    <p className="text-xs text-muted-foreground">Срок: {formatDate(d.deadline)}</p>
                  )}
                  {d.assignee && (
                    <p className="text-xs text-muted-foreground">
                      Ответственный: {d.assignee.lastName} {d.assignee.firstName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Акты устранения */}
        <TabsContent value="remediations" className="pt-4">
          {prescription.remediationActs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Акты устранения пока не созданы</p>
          ) : (
            <div className="space-y-2">
              {prescription.remediationActs.map((act) => (
                <div key={act.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Акт №{act.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {REMEDIATION_STATUS_LABELS[act.status] ?? act.status} · {formatDate(act.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Подписание */}
        <TabsContent value="approval" className="pt-4">
          <PrescriptionApprovalSection
            objectId={objectId}
            prescriptionId={prescriptionId}
            prescriptionNumber={prescription.number}
            approvalRoute={prescription.approvalRoute}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
