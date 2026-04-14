'use client';

import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { GeneralDocFilesTab } from './GeneralDocFilesTab';
import { useGeneralDoc } from './useGeneralDoc';
import type { ExecutionDocType } from '@prisma/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
  contractId: string;
  /** Тип документа: по умолчанию GENERAL_DOCUMENT */
  docType?: ExecutionDocType;
}

interface CreatedDoc {
  id: string;
  number: string;
  title: string;
}

interface AttachmentItem {
  s3Key: string;
  fileName: string;
}

// Диалог создания/редактирования общего документа (GENERAL_DOCUMENT, KS_6A, KS_11, KS_14)
export function GeneralDocDialog({ open, onOpenChange, objectId, contractId, docType = 'GENERAL_DOCUMENT' }: Props) {
  const { createMutation, updateMutation, submitMutation, uploadAttachment, deleteAttachment, isUploading } =
    useGeneralDoc(objectId, contractId);

  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [doc, setDoc] = useState<CreatedDoc | null>(null);
  const [title, setTitle] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const handleClose = () => {
    setMode('create');
    setDoc(null);
    setTitle('');
    setDocumentDate('');
    setNote('');
    setAttachments([]);
    onOpenChange(false);
  };

  const handleCreate = async () => {
    const created = await createMutation.mutateAsync({
      type: docType,
      title: title || undefined,
      documentDate: documentDate || undefined,
      note: note || undefined,
    });
    setDoc(created);
    setMode('edit');
  };

  const handleSave = () => {
    if (!doc) return;
    updateMutation.mutate({
      docId: doc.id,
      data: {
        title: title || undefined,
        documentDate: documentDate || undefined,
        note: note || undefined,
      },
    });
  };

  const handleSubmit = () => {
    if (!doc) return;
    submitMutation.mutate(doc.id, { onSuccess: () => handleClose() });
  };

  // Обработчики для вкладки «Файлы»
  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!doc) return;
      for (const file of files) {
        await uploadAttachment(doc.id, file);
        setAttachments((prev) => [...prev, { s3Key: '', fileName: file.name }]);
      }
    },
    [doc, uploadAttachment],
  );

  const handleDeleteAttachment = useCallback(
    async (s3Key: string, fileName: string) => {
      if (!doc) return;
      const ok = await deleteAttachment(doc.id, s3Key);
      if (ok) setAttachments((prev) => prev.filter((a) => a.fileName !== fileName));
    },
    [doc, deleteAttachment],
  );

  const isBusy = createMutation.isPending || updateMutation.isPending || submitMutation.isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Создать документ' : `Документ ${doc?.number ?? ''}`}
          </DialogTitle>
        </DialogHeader>

        {mode === 'edit' && doc ? (
          <Tabs defaultValue="info" className="mt-2">
            <TabsList>
              <TabsTrigger value="info">Информация</TabsTrigger>
              <TabsTrigger value="files">Файлы</TabsTrigger>
              <TabsTrigger value="approval" disabled>Согласование</TabsTrigger>
              <TabsTrigger value="signing" disabled>Подписание</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Номер</Label>
                <Input value={doc.number} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Дата документа</Label>
                <Input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Наименование документа" />
              </div>
              <div className="space-y-2">
                <Label>Примечание</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Дополнительные сведения" rows={3} />
              </div>
            </TabsContent>

            <TabsContent value="files">
              <GeneralDocFilesTab
                docId={doc.id}
                attachments={attachments}
                isUploading={isUploading}
                onUpload={handleUpload}
                onDelete={handleDeleteAttachment}
              />
            </TabsContent>

            <TabsContent value="approval" className="mt-4">
              <p className="text-sm text-muted-foreground py-8 text-center">
                Согласование доступно после проведения документа.
              </p>
            </TabsContent>

            <TabsContent value="signing" className="mt-4">
              <div className="py-8 text-center space-y-2">
                <Badge variant="secondary">ЭЦП в разработке</Badge>
                <p className="text-sm text-muted-foreground">
                  Подписание через КриптоПро CSP будет доступно в следующей версии.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Название <span className="text-muted-foreground text-xs">(необязательно)</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Автоматически по типу документа" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Дата документа</Label>
              <Input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Примечание</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Дополнительные сведения" rows={2} />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={handleClose} disabled={isBusy}>Закрыть</Button>
          {mode === 'create' ? (
            <Button onClick={handleCreate} disabled={isBusy}>
              {createMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Создание...</>
                : 'Создать'}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleSave} disabled={isBusy}>
                {updateMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Сохранение...</>
                  : 'Сохранить'}
              </Button>
              <Button onClick={handleSubmit} disabled={isBusy}>
                {submitMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Проведение...</>
                  : 'Провести'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
