'use client';

import { useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { Download, Eye, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CATEGORY_LABELS, type DocumentTemplateItem } from './useTemplates';

interface Props {
  template: DocumentTemplateItem;
  onDownload: (id: string, name: string) => Promise<void>;
  onGetPreview: (id: string) => Promise<string | null>;
}

export function TemplateCard({ template, onDownload, onGetPreview }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handlePreview = async () => {
    setPreviewOpen(true);
    if (!previewHtml) {
      setPreviewLoading(true);
      const html = await onGetPreview(template.id);
      setPreviewHtml(html);
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    await onDownload(template.id, template.name);
    setDownloading(false);
  };

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <CardTitle className="text-sm leading-tight">{template.name}</CardTitle>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {CATEGORY_LABELS[template.category] ?? template.category}
                </Badge>
                <span className="text-xs text-muted-foreground">v{template.version}</span>
                {!template.fileExists && (
                  <AlertCircle className="h-3 w-3 text-destructive" aria-label="Файл не найден на сервере" />
                )}
              </div>
            </div>
          </div>
          {template.description && (
            <CardDescription className="mt-2 text-xs line-clamp-2">
              {template.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="mt-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handlePreview}
          >
            <Eye className="mr-1 h-3 w-3" />
            Просмотр
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleDownload}
            disabled={!template.fileExists || downloading}
          >
            <Download className="mr-1 h-3 w-3" />
            {downloading ? 'Скачивание...' : 'Скачать .docx'}
          </Button>
        </CardContent>
      </Card>

      {/* Диалог предпросмотра шаблона (mammoth HTML) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{template.name}</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : previewHtml ? (
            <div
              className="prose prose-sm max-w-none border rounded p-4"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
            />
          ) : (
            <p className="text-muted-foreground text-sm">Предпросмотр недоступен.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
