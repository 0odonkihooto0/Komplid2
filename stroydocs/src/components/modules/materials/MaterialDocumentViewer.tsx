'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Download, FileText, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PdfViewer } from '@/components/shared/PdfViewer';
import { UploadDocumentDialog } from './UploadDocumentDialog';
import { MATERIAL_DOC_TYPE_LABELS } from '@/utils/constants';
import type { MaterialDocumentType } from '@prisma/client';

interface DocumentItem {
  id: string;
  type: MaterialDocumentType;
  fileName: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  materialId: string;
  materialName: string;
}

export function MaterialDocumentViewer({
  open,
  onOpenChange,
  contractId,
  materialId,
  materialName,
}: Props) {
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: documents = [], isLoading } = useQuery<DocumentItem[]>({
    queryKey: ['material-documents', contractId, materialId],
    queryFn: async () => {
      const res = await fetch(
        `/api/contracts/${contractId}/materials/${materialId}/documents`
      );
      const json = await res.json();
      return json.success ? json.data : [];
    },
    enabled: open,
  });

  return (
    <>
      <Dialog open={open && !viewingDoc} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
            <DialogTitle>Документы: {materialName}</DialogTitle>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Загрузить
            </Button>
          </div>
          </DialogHeader>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Нет загруженных документов
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {MATERIAL_DOC_TYPE_LABELS[doc.type]}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {doc.mimeType === 'application/pdf' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Просмотр"
                        onClick={() => setViewingDoc(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Скачать"
                      asChild
                    >
                      <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Встроенный PDF-просмотр */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingDoc?.fileName}</DialogTitle>
          </DialogHeader>
          {viewingDoc && <PdfViewer url={viewingDoc.downloadUrl} />}
        </DialogContent>
      </Dialog>

      {/* Загрузка нового документа */}
      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        contractId={contractId}
        materialId={materialId}
      />
    </>
  );
}
