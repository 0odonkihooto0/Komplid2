'use client';

import { useRef } from 'react';
import { X, Upload, Download, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import { formatBytes, formatDate } from '@/utils/format';
import {
  useDocumentVersions,
  useDocumentMutations,
  type ProjectDocument,
} from './useProjectDocuments';

interface DocumentVersionsPanelProps {
  projectId: string;
  document: ProjectDocument | null;
  onClose: () => void;
}

export function DocumentVersionsPanel({
  projectId,
  document,
  onClose,
}: DocumentVersionsPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: versions, isLoading } = useDocumentVersions(
    projectId,
    document?.id ?? null,
  );

  const { uploadNewVersion } = useDocumentMutations(projectId, document?.folderId ?? null);

  async function handleDownloadVersion(s3Key: string, fileName: string) {
    // Скачать конкретную версию через presigned URL
    try {
      const res = await fetch(
        `/api/objects/${projectId}/project-documents/${document!.id}/versions/download`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ s3Key }),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка получения ссылки');
      const a = window.document.createElement('a');
      a.href = json.data.url;
      a.download = fileName;
      a.click();
    } catch {
      // Если эндпоинт скачивания версии не реализован — открываем текущую
      toast({
        title: 'Скачивание версии',
        description: 'Откройте вкладку «Скачать» для актуального файла',
        variant: 'destructive',
      });
    }
  }

  function handleUploadNewVersion(files: FileList | null) {
    if (!files || !document) return;
    const file = files[0];
    uploadNewVersion.mutate({ documentId: document.id, file });
  }

  if (!document) return null;

  return (
    <>
      {/* Затемнение фона */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Правая панель */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-background shadow-xl">
        {/* Заголовок */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{document.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              История версий · Текущая: v{document.version}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 rounded-sm p-1 opacity-70 hover:opacity-100"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Кнопка загрузки новой версии */}
        <div className="border-b px-6 py-3">
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadNewVersion.isPending}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {uploadNewVersion.isPending ? 'Загрузка...' : 'Загрузить новую версию'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleUploadNewVersion(e.target.files)}
          />
        </div>

        {/* Список версий */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !versions || versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Clock className="mb-2 h-8 w-8 opacity-20" />
              <p className="text-sm">История версий пуста</p>
              <p className="mt-1 text-xs">
                Загрузите новую версию, чтобы начать отслеживать изменения
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((ver) => {
                const uploaderName = ver.uploadedBy
                  ? `${ver.uploadedBy.firstName} ${ver.uploadedBy.lastName}`.trim()
                  : '';
                const isCurrent = ver.version === document.version;

                return (
                  <div
                    key={ver.id}
                    className={`flex items-center gap-3 rounded-md border p-3 ${
                      isCurrent ? 'border-primary/40 bg-primary/5' : 'bg-card'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isCurrent ? 'default' : 'outline'}
                          className="shrink-0 text-xs"
                        >
                          v{ver.version}
                        </Badge>
                        {isCurrent && (
                          <span className="text-xs text-primary font-medium">Актуальная</span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {ver.fileName} · {formatBytes(ver.fileSize)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(ver.createdAt)}
                        {uploaderName ? ` · ${uploaderName}` : ''}
                      </p>
                      {ver.comment && (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">
                          {ver.comment}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownloadVersion(ver.s3Key, ver.fileName)}
                      className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label="Скачать эту версию"
                      title="Скачать"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
