'use client';

import { useRef, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileText,
  Image,
  FileSpreadsheet,
  Archive,
  File,
  QrCode,
  Download,
  History,
  Trash2,
  Upload,
  CloudDownload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { formatBytes, formatDate } from '@/utils/format';
import { useDocuments, useDocumentMutations, type ProjectDocument } from './useProjectDocuments';
import { QrCodeDialog } from './QrCodeDialog';
import { DocumentVersionsPanel } from './DocumentVersionsPanel';

interface DocumentListProps {
  projectId: string;
  folderId: string;
  folderName: string;
}

// Иконка по MIME-типу
function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.endsWith('.xlsx'))
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (mimeType.includes('zip') || mimeType.includes('archive'))
    return <Archive className="h-5 w-5 text-orange-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

export function DocumentList({ projectId, folderId, folderName }: DocumentListProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents, isLoading } = useDocuments(projectId, folderId);
  const { uploadDocument, deleteDocument } = useDocumentMutations(projectId, folderId);

  // Прогресс загрузки: filename → %
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Выбранный документ для QR-диалога / панели версий
  const [qrDocId, setQrDocId] = useState<string | null>(null);
  const [qrDocName, setQrDocName] = useState('');
  const [versionsDoc, setVersionsDoc] = useState<ProjectDocument | null>(null);

  async function handleUploadFiles(files: File[]) {
    for (const file of files) {
      setUploadProgress((prev) => ({ ...prev, [file.name]: 5 }));
      await uploadDocument.mutateAsync(
        {
          file,
          name: file.name,
          targetFolderId: folderId,
          onProgress: (pct) =>
            setUploadProgress((prev) => ({ ...prev, [file.name]: pct })),
        },
        {
          onSettled: () =>
            setUploadProgress((prev) => {
              const next = { ...prev };
              delete next[file.name];
              return next;
            }),
        },
      );
    }
  }

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) handleUploadFiles(accepted);
    },
    [folderId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // клик по списку не открывает диалог выбора — только кнопка
  });

  async function handleDownload(doc: ProjectDocument) {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/project-documents/${doc.id}/download`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка получения ссылки');
      window.open(json.data.url, '_blank');
    } catch (err) {
      toast({
        title: 'Ошибка скачивания',
        description: err instanceof Error ? err.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    }
  }

  function handleDelete(doc: ProjectDocument) {
    if (!window.confirm(`Удалить документ «${doc.name}»?`)) return;
    deleteDocument.mutate(doc.id);
  }

  const docList = documents ?? [];
  const uploadingNames = Object.keys(uploadProgress);

  return (
    <div className="flex h-full flex-col">
      {/* Заголовок */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">{folderName}</h2>
          <p className="text-xs text-muted-foreground">
            {isLoading ? '...' : `${docList.length} ${declFile(docList.length)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Скачать ZIP */}
          <a
            href={`/api/projects/${projectId}/project-documents/archive?folderId=${folderId}`}
            download
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50"
          >
            <CloudDownload className="h-4 w-4" />
            ZIP
          </a>
          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" />
            Загрузить файл
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0) handleUploadFiles(files);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Зона drag & drop + список файлов */}
      <div
        {...getRootProps()}
        className={`relative flex-1 overflow-y-auto p-4 transition-colors ${
          isDragActive ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : ''
        }`}
      >
        <input {...getInputProps()} />

        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md">
            <p className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow">
              Перетащите файлы сюда
            </p>
          </div>
        )}

        {/* Прогресс загружаемых файлов */}
        {uploadingNames.length > 0 && (
          <div className="mb-3 space-y-2">
            {uploadingNames.map((name) => (
              <div key={name} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div className="mb-1 flex justify-between">
                  <span className="truncate text-muted-foreground">{name}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    {uploadProgress[name]}%
                  </span>
                </div>
                <Progress value={uploadProgress[name]} className="h-1" />
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : docList.length === 0 && uploadingNames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <CloudDownload className="mb-3 h-10 w-10 opacity-20" />
            <p className="text-sm">Папка пуста</p>
            <p className="mt-1 text-xs">Перетащите файлы или нажмите «Загрузить файл»</p>
          </div>
        ) : (
          <div className="space-y-1">
            {docList.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                onDownload={() => handleDownload(doc)}
                onDelete={() => handleDelete(doc)}
                onQr={() => {
                  setQrDocId(doc.id);
                  setQrDocName(doc.name);
                }}
                onVersions={() => setVersionsDoc(doc)}
              />
            ))}
          </div>
        )}
      </div>

      {/* QR-диалог */}
      <QrCodeDialog
        open={!!qrDocId}
        onOpenChange={(v) => {
          if (!v) { setQrDocId(null); setQrDocName(''); }
        }}
        projectId={projectId}
        documentId={qrDocId}
        documentName={qrDocName}
      />

      {/* Панель версий */}
      <DocumentVersionsPanel
        projectId={projectId}
        document={versionsDoc}
        onClose={() => setVersionsDoc(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Строка документа
// ─────────────────────────────────────────────

interface DocumentRowProps {
  doc: ProjectDocument;
  onDownload: () => void;
  onDelete: () => void;
  onQr: () => void;
  onVersions: () => void;
}

function DocumentRow({ doc, onDownload, onDelete, onQr, onVersions }: DocumentRowProps) {
  const uploaderName = doc.uploadedBy
    ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`.trim()
    : '';

  return (
    <div className="group flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 hover:bg-muted/30">
      <FileIcon mimeType={doc.mimeType} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{doc.name}</span>
          {doc.version > 1 && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              v{doc.version}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatBytes(doc.fileSize)} · {formatDate(doc.createdAt)}
          {uploaderName ? ` · ${uploaderName}` : ''}
        </p>
      </div>

      {/* Кнопки действий */}
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <ActionButton
          aria-label="QR-код для верификации"
          title="QR-код"
          onClick={onQr}
        >
          <QrCode className="h-4 w-4" />
        </ActionButton>
        <ActionButton
          aria-label="Скачать файл"
          title="Скачать"
          onClick={onDownload}
        >
          <Download className="h-4 w-4" />
        </ActionButton>
        <ActionButton
          aria-label="История версий"
          title="Версии"
          onClick={onVersions}
        >
          <History className="h-4 w-4" />
        </ActionButton>
        <ActionButton
          aria-label="Удалить документ"
          title="Удалить"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Склонение слова "файл"
function declFile(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'файлов';
  if (mod10 === 1) return 'файл';
  if (mod10 >= 2 && mod10 <= 4) return 'файла';
  return 'файлов';
}
