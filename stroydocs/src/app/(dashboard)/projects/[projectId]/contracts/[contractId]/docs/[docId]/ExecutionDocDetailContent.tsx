'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, FileDown, RefreshCw, Pencil, FileEdit, Pen, QrCode, Stamp, FileCode, ChevronDown, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocCommentsList } from '@/components/modules/execution-docs/DocCommentsList';
import { ApprovalTree } from '@/components/modules/execution-docs/ApprovalTree';
import { EditDocFieldsDialog } from '@/components/modules/execution-docs/EditDocFieldsDialog';
import { AosrFieldsTable } from '@/components/modules/execution-docs/AosrFieldsTable';
import { SignatureDialog } from '@/components/modules/execution-docs/SignatureDialog';
import { QrCodeDialog } from '@/components/modules/execution-docs/QrCodeDialog';
import { StampPositioner } from '@/components/modules/execution-docs/StampPositioner';
import { LinkedDocsTab } from '@/components/modules/execution-docs/LinkedDocsTab';
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
  const [activeTab, setActiveTab] = useState('document');
  const [editFieldsOpen, setEditFieldsOpen] = useState(false);
  const [fieldsTableOpen, setFieldsTableOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [signatureType, setSignatureType] = useState<'embedded' | 'detached' | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [stampDialogOpen, setStampDialogOpen] = useState(false);

  const { doc, isLoading, generatePdfMutation, autofillFromAosrMutation, exportXmlMutation, unpostMutation } = useExecutionDocDetail(
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
            {/* Индикатор ручного редактирования */}
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

        {/* Действия — видны на всех вкладках */}
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
          {/* Кнопки редактирования — только для DRAFT и REJECTED */}
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
          {/* XML-экспорт по схеме Минстроя */}
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
          {/* Подписание — КриптоПро CSP */}
          <Button variant="outline" onClick={() => setSignatureType('embedded')}>
            <Pen className="mr-2 h-4 w-4" />
            Встроенная подпись
          </Button>
          <Button variant="outline" onClick={() => setSignatureType('detached')}>
            <Pen className="mr-2 h-4 w-4" />
            Открепленная подпись
          </Button>
          {/* Действия (доступно при статусе IN_REVIEW) */}
          {doc.status === 'IN_REVIEW' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Действия <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => unpostMutation.mutate()}
                  disabled={unpostMutation.isPending}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  Отменить проведение
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Вкладки документа */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="document">Документ</TabsTrigger>
          <TabsTrigger value="approval">Согласование</TabsTrigger>
          <TabsTrigger value="signing">Подписание</TabsTrigger>
          <TabsTrigger value="comments">
            Замечания
            {/* Счётчик открытых замечаний */}
            {doc.comments.filter((c) => c.status === 'OPEN').length > 0 && (
              <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                {doc.comments.filter((c) => c.status === 'OPEN').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="versions">Версии</TabsTrigger>
          <TabsTrigger value="tim">ТИМ</TabsTrigger>
          <TabsTrigger value="linked">Связанные документы</TabsTrigger>
          <TabsTrigger value="requisites">Сохр. реквизиты</TabsTrigger>
        </TabsList>

        {/* Вкладка: Документ */}
        <TabsContent value="document" className="mt-4">
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

          {/* Inline-таблица редактирования полей АОСР */}
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

          {/* PDF-просмотрщик */}
          {doc.downloadUrl ? (
            <PdfViewer url={doc.downloadUrl} />
          ) : (
            <div className="flex h-[400px] items-center justify-center rounded-md border bg-muted/50">
              <p className="text-muted-foreground">PDF ещё не сгенерирован. Нажмите «Сгенерировать PDF».</p>
            </div>
          )}
        </TabsContent>

        {/* Вкладка: Согласование */}
        <TabsContent value="approval" className="mt-4">
          <ApprovalTree
            projectId={projectId}
            contractId={contractId}
            docId={docId}
            docStatus={doc.status}
          />
        </TabsContent>

        {/* Вкладка: Подписание */}
        <TabsContent value="signing" className="mt-4">
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-14 text-center">
            <p className="text-sm font-medium text-muted-foreground">Подписание ЭЦП</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Функция доступна после настройки провайдера ЭЦП (КриптоПро CSP) в настройках организации
            </p>
          </div>
        </TabsContent>

        {/* Вкладка: Замечания */}
        <TabsContent value="comments" className="mt-4">
          <DocCommentsList
            projectId={projectId}
            contractId={contractId}
            docId={docId}
          />
        </TabsContent>

        {/* Вкладка: Версии — в разработке */}
        <TabsContent value="versions" className="mt-4">
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-14 text-center">
            <p className="text-sm font-medium text-muted-foreground">Версии документа — в разработке</p>
          </div>
        </TabsContent>

        {/* Вкладка: ТИМ — в разработке */}
        <TabsContent value="tim" className="mt-4">
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-14 text-center">
            <p className="text-sm font-medium text-muted-foreground">Связи с ТИМ-моделью — в разработке</p>
          </div>
        </TabsContent>

        {/* Вкладка: Связанные документы */}
        <TabsContent value="linked" className="mt-4">
          <LinkedDocsTab projectId={projectId} contractId={contractId} docId={docId} />
        </TabsContent>

        {/* Вкладка: Сохранённые реквизиты — в разработке */}
        <TabsContent value="requisites" className="mt-4">
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-14 text-center">
            <p className="text-sm font-medium text-muted-foreground">Сохранённые реквизиты — в разработке</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Диалог подписания (КриптоПро CSP) */}
      {signatureType && (
        <SignatureDialog
          open={!!signatureType}
          onOpenChange={(open) => { if (!open) setSignatureType(null); }}
          signatureType={signatureType}
          docTitle={`${EXECUTION_DOC_TYPE_LABELS[doc.type]} № ${doc.number}`}
        />
      )}

      {/* Диалог редактирования полей для остальных типов документов */}
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
