'use client';

import { useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/useToast';
import { useEventMutations, type ProjectEvent } from './useProjectEvents';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  event: ProjectEvent;
}

export function UploadProtocolDialog({ open, onOpenChange, projectId, event }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { uploadProtocol } = useEventMutations(projectId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(30);

    try {
      await uploadProtocol(event.id, selectedFile);
      setProgress(100);
      toast({ title: 'Протокол прикреплён' });
      onOpenChange(false);
      setSelectedFile(null);
      setProgress(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки';
      toast({ title: 'Ошибка', description: message, variant: 'destructive' });
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!uploading) {
      setSelectedFile(null);
      setProgress(0);
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Загрузить протокол</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Мероприятие: <span className="font-medium text-foreground">{event.title}</span>
          </p>

          {/* Зона выбора файла */}
          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 transition-colors hover:border-primary/50"
            onClick={() => fileRef.current?.click()}
          >
            {selectedFile ? (
              <>
                <FileText className="h-8 w-8 text-primary" />
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(0)} КБ
                </p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Нажмите для выбора файла
                </p>
                <p className="text-xs text-muted-foreground">PDF, DOC, DOCX</p>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Прогресс загрузки */}
          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-xs text-muted-foreground">Загрузка...</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={uploading}
          >
            Отмена
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? 'Загрузка...' : 'Прикрепить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
