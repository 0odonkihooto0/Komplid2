'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/utils/format';
import {
  useRemediationAct,
  useSubmitRemediationAct,
  useApproveRemediationAct,
} from './useRemediationActs';

const STATUS_LABELS: Record<string, string> = {
  DRAFT:          'Черновик',
  PENDING_REVIEW: 'На проверке',
  ACCEPTED:       'Принят',
  REJECTED:       'Отклонён',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT:          'outline',
  PENDING_REVIEW: 'default',
  ACCEPTED:       'secondary',
  REJECTED:       'destructive',
};

const DEFECT_STATUS_LABELS: Record<string, string> = {
  OPEN:        'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED:    'Устранён',
  CONFIRMED:   'Подтверждён',
  REJECTED:    'Отклонён',
};

interface Props {
  objectId: string;
  actId: string;
}

export function RemediationActCard({ objectId, actId }: Props) {
  const router = useRouter();
  const [comment, setComment] = useState('');

  // Все хуки до return
  const { data: act, isLoading } = useRemediationAct(objectId, actId);
  const submitMutation = useSubmitRemediationAct(objectId);
  const approveMutation = useApproveRemediationAct(objectId, actId);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!act) {
    return <p className="p-6 text-muted-foreground">Акт устранения не найден</p>;
  }

  return (
    <div className="space-y-4 p-6">
      {/* Шапка */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Акт устранения №{act.number}</h2>
          <Badge variant={STATUS_VARIANTS[act.status] ?? 'outline'} className="mt-1">
            {STATUS_LABELS[act.status] ?? act.status}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Информация</TabsTrigger>
          <TabsTrigger value="defects">Недостатки ({act.defectIds.length})</TabsTrigger>
          <TabsTrigger value="sign">Подписание</TabsTrigger>
        </TabsList>

        {/* Вкладка: Информация */}
        <TabsContent value="info" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
            <div>
              <p className="text-xs text-muted-foreground">Дата составления</p>
              <p className="text-sm font-medium">{formatDate(act.issuedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Автор</p>
              <p className="text-sm font-medium">
                {act.issuedBy.lastName} {act.issuedBy.firstName}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Предписание</p>
              <Button
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() =>
                  router.push(`/objects/${objectId}/sk/prescriptions/${act.prescription.id}`)
                }
              >
                №{act.prescription.number}
              </Button>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Проверка</p>
              <Button
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() =>
                  router.push(`/objects/${objectId}/sk/inspections/${act.inspection.id}`)
                }
              >
                №{act.inspection.number}
              </Button>
            </div>
          </div>

          {act.status === 'DRAFT' && (
            <Button
              className="w-full"
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate(actId)}
            >
              {submitMutation.isPending ? 'Отправка...' : 'Отправить на проверку'}
            </Button>
          )}
        </TabsContent>

        {/* Вкладка: Недостатки */}
        <TabsContent value="defects" className="pt-4">
          {act.defects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Недостатки не указаны</p>
          ) : (
            <div className="space-y-3">
              {act.defects.map((d) => {
                const detail = act.remediationDetails?.[d.id];
                return (
                  <div key={d.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{d.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {DEFECT_STATUS_LABELS[d.status] ?? d.status}
                      </Badge>
                    </div>
                    {detail?.measures && (
                      <div>
                        <p className="text-xs text-muted-foreground">Мероприятия</p>
                        <p className="text-sm">{detail.measures}</p>
                      </div>
                    )}
                    {detail?.note && (
                      <div>
                        <p className="text-xs text-muted-foreground">Примечание</p>
                        <p className="text-sm text-muted-foreground">{detail.note}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Вкладка: Подписание */}
        <TabsContent value="sign" className="pt-4">
          {act.status === 'DRAFT' && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
              Акт ещё не отправлен на проверку. Перейдите на вкладку «Информация» и нажмите
              «Отправить на проверку».
            </div>
          )}

          {act.status === 'PENDING_REVIEW' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Комментарий (необязательно)</Label>
                <Textarea
                  rows={3}
                  placeholder="Укажите причину отклонения или примечание..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={approveMutation.isPending}
                  onClick={() =>
                    approveMutation.mutate({ decision: 'ACCEPTED', comment: comment || undefined })
                  }
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Принять
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={approveMutation.isPending}
                  onClick={() =>
                    approveMutation.mutate({ decision: 'REJECTED', comment: comment || undefined })
                  }
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Отклонить
                </Button>
              </div>
            </div>
          )}

          {act.status === 'ACCEPTED' && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                <CheckCircle className="h-4 w-4" />
                Акт принят. Недостатки переведены в статус «Устранён».
              </p>
            </div>
          )}

          {act.status === 'REJECTED' && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-red-700">
                <XCircle className="h-4 w-4" />
                Акт отклонён. Недостатки возвращены в работу.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
