'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, FileDown, RefreshCw, Pencil, FileEdit, Paperclip, Pen, QrCode, Stamp, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DocCommentsList } from '@/components/modules/execution-docs/DocCommentsList';
import { ApprovalTree } from '@/components/modules/execution-docs/ApprovalTree';
import { LinkedDesignDocs } from '@/components/modules/execution-docs/LinkedDesignDocs';
import { EditDocFieldsDialog } from '@/components/modules/execution-docs/EditDocFieldsDialog';
import { AosrFieldsTable } from '@/components/modules/execution-docs/AosrFieldsTable';
import { SignatureDialog } from '@/components/modules/execution-docs/SignatureDialog';
import { QrCodeDialog } from '@/components/modules/execution-docs/QrCodeDialog';
import { StampPositioner } from '@/components/modules/execution-docs/StampPositioner';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { useExecutionDocDetail } from '@/components/modules/execution-docs/useExecutionDocDetail';
import { EXECUTION_DOC_TYPE_LABELS, EXECUTION_DOC_STATUS_LABELS } from '@/utils/constants';
import { formatDate } from '@/utils/format';

// SSR-несовместимые компоненты — загружаем только на клиенте
const PdfViewer = dynamic(
  () => import('@/components/shared/PdfViewer').then((m) => ({ default: m.PdfViewer })),
  { ssr: false }
);
const DocRichTextEditor = dynamic(
  () => import('@/components/modules/execution-docs/DocRichTextEditor').then((m) => ({ default: m.DocRichTextEditor })),
  { ssr: false }
);

interface Props {
  projectId: string;
  contractId: string;
  docId: string;
}

export function ExecutionDocDetailContent({ projectId, contractId, docId }: Props) {
  const [editFieldsOpen, setEditFieldsOpen] = useState(false);
  const [fieldsTableOpen, setFieldsTableOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [attachmentPanelOpen, setAttachmentPanelOpen] = useState(false);
  const [signatureType, setSignatureType] = useState<'embedded' | 'detached' | null>(null);
  const [secondPdfUrl, setSecondPdfUrl] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [stampDialogOpen, setStampDialogOpen] = useState(false);

  const { doc, isLoading, generatePdfMutation, autofillFromAosrMutation, exportXmlMutation } = useExecutionDocDetail(
    projectId,
    contractId,
    docId
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!doc) {
    return <p className="text-muted-foreground">Документ не найден</p>;
  }

  const canEdit = doc.status === 'DRAFT' || doc.status === 'REJECTED';
  const isEdited = !!doc.lastEditedAt;

  return (
    <div className="space-y-6">
      <Breadcrumb />
      {/* Навигация */}
      <Link
        href={`/objects/${projectId}/contracts/${contractId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Назад к договору
      </Link>

      {/* Шапка */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {EXECUTION_DOC_TYPE_LABELS[doc.type]} № {doc.number}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{doc.title}</p>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={doc.status} label={EXECUTION_DOC_STATUS_LABELS[doc.status]} />
            {/* Индикатор ручного редактирования (Фаза 3.6) */}
            {isEdited && (
              <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-300">
                <Pencil className="h-3 w-3" />
                Изменён вручную
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Создан: {formatDate(doc.createdAt)} — {doc.createdBy.lastName} {doc.createdBy.firstName}
            </span>
            {doc.xmlExportedAt && (
              <span className="text-xs text-muted-foreground">
                XML: {formatDate(doc.xmlExportedAt)}
              </span>
            )}
          </div>
          {doc.workRecord && (
            <p className="mt-1 text-sm">
              Работа: <span className="font-mono">{doc.workRecord.workItem.projectCipher}</span>{' '}
              — {doc.workRecord.workItem.name}
            </p>
          )}
        </div>

        {/* Действия */}
        <div className="flex flex-wrap gap-2">
          {!doc.s3Key && (
            <Button
              onClick={() => generatePdfMutation.mutate()}
              disabled={generatePdfMutation.isPending}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {generatePdfMutation.isPending ? 'Генерация...' : 'Сгенерировать PDF'}
            </Button>
          )}
          {doc.type === 'OZR' && (
            <Button
              variant="outline"
              onClick={() => autofillFromAosrMutation.mutate()}
              disabled={autofillFromAosrMutation.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {autofillFromAosrMutation.isPending ? 'Обновление...' : 'Обновить из АОСР'}
            </Button>
          )}
          {/* Кнопки редактирования — только для DRAFT и REJECTED (Фаза 3.6) */}
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => doc.type === 'AOSR' ? setFieldsTableOpen((v) => !v) : setEditFieldsOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Редактировать поля
              </Button>
              <Button variant="outline" onClick={() => setEditorOpen((v) => !v)}>
                <FileEdit className="mr-2 h-4 w-4" />
                {editorOpen ? 'Скрыть редактор' : 'Редактор текста'}
              </Button>
            </>
          )}
          {/* Кнопка приложений */}
          <Button
            variant={attachmentPanelOpen ? 'secondary' : 'outline'}
            onClick={() => { setAttachmentPanelOpen((v) => !v); setSecondPdfUrl(null); }}
          >
            <Paperclip className="mr-2 h-4 w-4" />
            Приложения
          </Button>
          {/* QR-код документа */}
          <Button variant="outline" onClick={() => setQrDialogOpen(true)}>
            <QrCode className="mr-2 h-4 w-4" />
            QR-код
          </Button>
          {/* Штамп на PDF */}
          {doc.s3Key && doc.downloadUrl && (
            <Button variant="outline" onClick={() => setStampDialogOpen(true)}>
              <Stamp className="mr-2 h-4 w-4" />
              Штамп
            </Button>
          )}
          {/* XML-экспорт по схеме Минстроя (Модуль 10, Шаг 8) */}
          {(doc.type === 'AOSR' || doc.type === 'OZR') && (
            <Button
              variant="outline"
              onClick={() => exportXmlMutation.mutate()}
              disabled={exportXmlMutation.isPending}
            >
              <FileCode className="mr-2 h-4 w-4" />
              {exportXmlMutation.isPending ? 'Экспорт...' : 'Экспорт XML'}
            </Button>
          )}
          {/* Подписание — Фаза 4 */}
          <Button variant="outline" onClick={() => setSignatureType('embedded')}>
            <Pen className="mr-2 h-4 w-4" />
            Встроенная подпись
          </Button>
          <Button variant="outline" onClick={() => setSignatureType('detached')}>
            <Pen className="mr-2 h-4 w-4" />
            Открепленная подпись
          </Button>
        </div>
      </div>

      {/* TipTap rich-text редактор (раскрывается при клике) */}
      {editorOpen && (
        <DocRichTextEditor
          projectId={projectId}
          contractId={contractId}
          docId={docId}
          docStatus={doc.status}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {/* Inline-таблица редактирования полей АОСР (Фаза 3.6) */}
      {doc.type === 'AOSR' && fieldsTableOpen && (
        <AosrFieldsTable
          projectId={projectId}
          contractId={contractId}
          docId={docId}
          docStatus={doc.status}
          currentOverrideFields={
            doc.overrideFields && typeof doc.overrideFields === 'object'
              ? (doc.overrideFields as Record<string, string>)
              : null
          }
          suggestedFields={doc.suggestedFields}
          onClose={() => setFieldsTableOpen(false)}
        />
      )}

      {/* Контент: PDF + (split-view если приложения) + замечания + workflow */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Основной PDF */}
          <div className={attachmentPanelOpen && secondPdfUrl ? 'grid grid-cols-2 gap-4' : ''}>
            <div>
              {doc.downloadUrl ? (
                <PdfViewer url={doc.downloadUrl} />
              ) : (
                <div className="flex h-[400px] items-center justify-center rounded-md border bg-muted/50">
                  <p className="text-muted-foreground">PDF ещё не сгенерирован. Нажмите «Сгенерировать PDF».</p>
                </div>
              )}
            </div>
            {/* Второй PDF-вьювер для приложения */}
            {attachmentPanelOpen && secondPdfUrl && (
              <PdfViewer url={secondPdfUrl} />
            )}
          </div>

          {/* Панель приложений */}
          {attachmentPanelOpen && (
            <div className="rounded-md border p-4 space-y-2">
              <p className="text-sm font-medium">Приложения</p>
              <p className="text-sm text-muted-foreground">
                Для просмотра приложений откройте вкладку «Документарий» в договоре
                и выберите связанные сертификаты или схемы.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <ApprovalTree
            projectId={projectId}
            contractId={contractId}
            docId={docId}
            docStatus={doc.status}
          />
          <DocCommentsList
            projectId={projectId}
            contractId={contractId}
            docId={docId}
          />
          <LinkedDesignDocs projectId={projectId} docId={docId} />
        </div>
      </div>

      {/* Диалог подписания (Фаза 4 — КриптоПро) */}
      {signatureType && (
        <SignatureDialog
          open={!!signatureType}
          onOpenChange={(open) => { if (!open) setSignatureType(null); }}
          signatureType={signatureType}
          docTitle={`${EXECUTION_DOC_TYPE_LABELS[doc.type]} № ${doc.number}`}
        />
      )}

      {/* Диалог редактирования полей для остальных типов документов (Фаза 3.6.1) */}
      {doc.type !== 'AOSR' && (
        <EditDocFieldsDialog
          open={editFieldsOpen}
          onClose={() => setEditFieldsOpen(false)}
          projectId={projectId}
          contractId={contractId}
          docId={docId}
          docType={doc.type}
          docStatus={doc.status}
          currentOverrideFields={
            doc.overrideFields && typeof doc.overrideFields === 'object'
              ? (doc.overrideFields as Record<string, string>)
              : null
          }
        />
      )}
      {/* Диалог QR-кода */}
      <QrCodeDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        projectId={projectId}
        contractId={contractId}
        docId={docId}
        docTitle={`${EXECUTION_DOC_TYPE_LABELS[doc.type]} № ${doc.number}`}
        hasS3Key={!!doc.s3Key}
      />
      {/* Диалог штампа на PDF */}
      {doc.downloadUrl && (
        <StampPositioner
          open={stampDialogOpen}
          onOpenChange={setStampDialogOpen}
          projectId={projectId}
          contractId={contractId}
          docId={docId}
          docNumber={doc.number}
          pdfUrl={doc.downloadUrl}
        />
      )}
    </div>
  );
}
