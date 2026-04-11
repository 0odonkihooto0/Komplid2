'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import nextDynamic from 'next/dynamic';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useDesignDocDetail } from '@/components/objects/pir/useDesignDocDetail';
import { DesignDocComments } from '@/components/objects/pir/DesignDocComments';
import { DesignDocExpertise } from '@/components/objects/pir/DesignDocExpertise';
import { PIRApprovalWidget } from '@/components/modules/approval/PIRApprovalWidget';
import { DOC_STATUS_CONFIG, DOC_ALLOWED_ACTIONS, DOC_ACTION_LABELS } from '@/lib/pir/doc-state-machine';

export const dynamic = 'force-dynamic';

// PDF-просмотрщик загружается только на клиенте (SSR несовместим)
const PdfViewer = nextDynamic(
  () => import('@/components/shared/PdfViewer').then((m) => m.PdfViewer),
  { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-md bg-muted" /> }
);

// Менеджеры штампов и QR-кодов — только на клиенте (используют react-pdf)
const PdfStampManager = nextDynamic(
  () => import('@/components/objects/pir/stamps/PdfStampManager').then((m) => m.PdfStampManager),
  { ssr: false }
);
const PdfQrManager = nextDynamic(
  () => import('@/components/objects/pir/stamps/PdfQrManager').then((m) => m.PdfQrManager),
  { ssr: false }
);

export default function PIRDocDetailPage({
  params,
}: {
  params: { objectId: string; docId: string };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('document');

  const { data: session } = useSession();

  const {
    doc,
    isLoading,
    conductMutation,
    cancelMutation,
    sendReviewMutation,
    approveReviewMutation,
  } = useDesignDocDetail(params.objectId, params.docId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Документ не найден</p>
        <Button
          variant="link"
          className="mt-2"
          onClick={() => router.push(`/objects/${params.objectId}/pir/documentation`)}
        >
          Вернуться к списку
        </Button>
      </div>
    );
  }

  const statusKey = doc.status;
  const statusConfig = DOC_STATUS_CONFIG[statusKey];
  const allowedActions = DOC_ALLOWED_ACTIONS[statusKey] ?? [];
  const isEditable = !['APPROVED', 'CANCELLED'].includes(doc.status);

  // Индикатор версии: показываем если есть потомки или родитель
  const showVersionBadge = doc.versions.length > 0 || doc.parentDoc !== null;
  const totalVersions = doc.versions.length + (doc.parentDoc ? 1 : 0) + 1;

  return (
    <div className="space-y-4">
      {/* Навигация назад */}
      <button
        onClick={() => router.push(`/objects/${params.objectId}/pir/documentation`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Документация ПИР
      </button>

      {/* Шапка карточки */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{doc.name}</h1>
            {showVersionBadge && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                v{doc.version}{totalVersions > 1 ? ` из ${totalVersions}` : ''}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {doc.category && <span className="font-medium text-foreground">{doc.category}</span>}
            {doc.category && <span>·</span>}
            <span>от {formatDate(doc.createdAt)}</span>
            {doc.responsibleUser && (
              <span>· {doc.responsibleUser.lastName} {doc.responsibleUser.firstName}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Статус Badge */}
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium',
              statusConfig?.badgeClass ?? 'bg-gray-100 text-gray-700'
            )}
          >
            {statusConfig?.label ?? doc.status}
          </span>

          {/* Кнопки действий по статусной машине */}
          {allowedActions.includes('conduct') && (
            <Button
              size="sm"
              onClick={() => conductMutation.mutate()}
              disabled={conductMutation.isPending}
            >
              {DOC_ACTION_LABELS.conduct}
            </Button>
          )}
          {allowedActions.includes('send_review') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => sendReviewMutation.mutate()}
              disabled={sendReviewMutation.isPending}
            >
              {DOC_ACTION_LABELS.send_review}
            </Button>
          )}
          {allowedActions.includes('approve_review') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => approveReviewMutation.mutate()}
              disabled={approveReviewMutation.isPending}
            >
              {DOC_ACTION_LABELS.approve_review}
            </Button>
          )}
          {allowedActions.includes('cancel') && isEditable && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {DOC_ACTION_LABELS.cancel}
            </Button>
          )}
        </div>
      </div>

      {/* Вкладки карточки */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
        <TabsList>
          <TabsTrigger value="document">Документ</TabsTrigger>
          <TabsTrigger value="comments">
            Замечания
            {doc._count.comments > 0 && (
              <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                {doc._count.comments}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="expertise">Экспертиза</TabsTrigger>
          <TabsTrigger value="approval">Согласование</TabsTrigger>
        </TabsList>

        {/* Документ (PDF-viewer) */}
        <TabsContent value="document" className="mt-4">
          {doc.downloadUrl ? (
            <PdfViewer url={doc.downloadUrl} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
              <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Файл документа не загружен</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Прикрепите PDF или DWG файл к документу
              </p>
            </div>
          )}

          {/* Список всех прикреплённых файлов */}
          {doc.s3Keys.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Все файлы</p>
              {doc.s3Keys.map((key, idx) => {
                // pdfUrl доступен только для текущего файла (pre-signed URL)
                const filePdfUrl = key === doc.currentS3Key ? doc.downloadUrl : null;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-muted-foreground">
                      {key.split('/').pop() ?? `Файл ${idx + 1}`}
                    </span>
                    {/* Менеджеры штампов и QR (только для авторизованных пользователей) */}
                    {session?.user?.organizationId && (
                      <>
                        <PdfStampManager
                          objectId={params.objectId}
                          docId={params.docId}
                          s3Key={key}
                          pdfUrl={filePdfUrl}
                          orgId={session.user.organizationId}
                        />
                        <PdfQrManager
                          objectId={params.objectId}
                          docId={params.docId}
                          s3Key={key}
                          pdfUrl={filePdfUrl}
                          orgId={session.user.organizationId}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Замечания */}
        <TabsContent value="comments" className="mt-4">
          <DesignDocComments
            projectId={params.objectId}
            docId={params.docId}
            sessionUserId={doc.author.id}
          />
        </TabsContent>

        {/* Экспертиза */}
        <TabsContent value="expertise" className="mt-4">
          <DesignDocExpertise
            projectId={params.objectId}
            docId={params.docId}
            expertiseStatus={doc.expertiseStatus}
            expertiseDate={doc.expertiseDate}
            expertiseComment={doc.expertiseComment}
          />
        </TabsContent>

        {/* Согласование */}
        <TabsContent value="approval" className="mt-4">
          <PIRApprovalWidget
            entityType="DESIGN_DOC"
            entityId={params.docId}
            objectId={params.objectId}
            approvalRoute={doc.approvalRoute}
            entityStatus={doc.status}
            isTerminalStatus={['APPROVED', 'CANCELLED'].includes(doc.status)}
            canStartApproval={!['APPROVED', 'CANCELLED', 'IN_APPROVAL'].includes(doc.status)}
            queryKey={['design-doc', params.docId]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
