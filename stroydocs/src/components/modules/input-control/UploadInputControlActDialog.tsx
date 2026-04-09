'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  recordId: string;
}

export function UploadInputControlActDialog({ open, onOpenChange, contractId, recordId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Шаг 1: Создать запись и получить URL для загрузки
      const res = await fetch(
        `/api/contracts/${contractId}/input-control/${recordId}/acts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
          }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      // Шаг 2: Загрузить файл в S3
      const { uploadUrl } = json.data;
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      return json.data.act;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['input-control', contractId] });
      toast({ title: 'Акт входного контроля загружен' });
      setSelectedFile(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Загрузить акт входного контроля (АВК)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            {selectedFile ? (
              <p className="text-sm font-medium">{selectedFile.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Нажмите для выбора файла (PDF)
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Загрузка...' : 'Загрузить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
