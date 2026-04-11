'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import nextDynamic from 'next/dynamic';
import { ArrowLeft, ChevronDown, Download, FileText, PenLine, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useDesignDocDetail } from '@/components/objects/pir/useDesignDocDetail';
import { DesignDocComments } from '@/components/objects/pir/DesignDocComments';
import { DesignDocExpertise } from '@/components/objects/pir/DesignDocExpertise';
import { DesignDocChangelog } from '@/components/objects/pir/DesignDocChangelog';
import { DesignDocTimTab } from '@/components/objects/pir/DesignDocTimTab';
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

// Маппинг статусов маршрута согласования
const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'На согласовании',
  APPROVED: 'Согласовано',
  REJECTED: 'Отклонено',
  RESET: 'Сброшено',
};

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
    sendToSEDMutation,
    printApprovalSheetMutation,
    printSigningSheetMutation,
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

  // Статус согласования
  const approvalStatusLabel = doc.approvalRoute
    ? (APPROVAL_STATUS_LABELS[doc.approvalRoute.status] ?? doc.approvalRoute.status)
    : '—';

  // Статус подписания — производится после согласования (APPROVED)
  const signStatusLabel = doc.status === 'APPROVED' ? 'Подписан' : '—';

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

      {/* Шапка карточки (ЦУС стр. 106) */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {/* Строка 1: идентификатор документа */}
          <h1 className="text-lg font-semibold">
            Документ ПИР № {doc.number} от {formatDate(doc.createdAt)}
          </h1>
          {/* Наименование */}
          <p className="mt-0.5 text-sm text-muted-foreground">{doc.name}</p>
          {/* Строка 2: статусная строка */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>Версия №{doc.version}</span>
            <span className="text-border">|</span>
            <span
              className={cn(
                'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
                statusConfig?.badgeClass ?? 'bg-gray-100 text-gray-700'
              )}
            >
              {statusConfig?.label ?? doc.status}
            </span>
            <span className="text-border">|</span>
            <span>Внешний № —</span>
            <span className="text-border">|</span>
            <span>Согласование: {approvalStatusLabel}</span>
            <span className="text-border">|</span>
            <span>Подписание: {signStatusLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {/* Документооборот — создание СЭД-документа со ссылкой на этот чертёж */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={sendToSEDMutation.isPending}
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
                {sendToSEDMutation.isPending ? 'Создание...' : 'Документооборот'}
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => sendToSEDMutation.mutate()}>
                Создать в СЭД
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Вкладки карточки (ЦУС стр. 106): Документ | Согласование | Подписание | Замечания | Изменения | ТИМ | Экспертиза */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
        <TabsList className="flex-wrap">
          <TabsTrigger value="document">Документ</TabsTrigger>
          <TabsTrigger value="approval">Согласование</TabsTrigger>
          <TabsTrigger value="signing">Подписание</TabsTrigger>
          <TabsTrigger value="comments">
            Замечания
            {doc._count.comments > 0 && (
              <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                {doc._count.comments}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="changes">
            Изменения
            {doc._count.changes > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {doc._count.changes}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tim">
            ТИМ
            {doc.timLinksCount > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                {doc.timLinksCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="expertise">Экспертиза</TabsTrigger>
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

        {/* Согласование */}
        <TabsContent value="approval" className="mt-4">
          <div className="mb-3 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={printApprovalSheetMutation.isPending}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {printApprovalSheetMutation.isPending ? 'Формирование...' : 'Скачать'}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => printApprovalSheetMutation.mutate()}>
                  Лист согласования (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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

        {/* Подписание (ЭЦП — заглушка до настройки КриптоПро) */}
        <TabsContent value="signing" className="mt-4">
          <div className="mb-3 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={printSigningSheetMutation.isPending}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {printSigningSheetMutation.isPending ? 'Формирование...' : 'Скачать'}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => printSigningSheetMutation.mutate()}>
                  Лист подписания (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-14 text-center">
            <PenLine className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Подписание ЭЦП</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Функция доступна после настройки провайдера электронной подписи (КриптоПро CSP)
              в настройках организации
            </p>
            {doc.status === 'APPROVED' && (
              <div className="mt-4 rounded-md bg-green-50 px-4 py-2.5 text-sm text-green-700">
                Документ согласован к производству
              </div>
            )}
          </div>
        </TabsContent>

        {/* Замечания */}
        <TabsContent value="comments" className="mt-4">
          <DesignDocComments
            projectId={params.objectId}
            docId={params.docId}
            sessionUserId={doc.author.id}
          />
        </TabsContent>

        {/* Журнал изменений */}
        <TabsContent value="changes" className="mt-4">
          <DesignDocChangelog
            projectId={params.objectId}
            docId={params.docId}
            currentVersion={doc.version}
          />
        </TabsContent>

        {/* ТИМ — связанные BIM-элементы */}
        <TabsContent value="tim" className="mt-4">
          <DesignDocTimTab
            projectId={params.objectId}
            docId={params.docId}
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
      </Tabs>
    </div>
  );
}
