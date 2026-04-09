'use client';

import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { MATERIAL_DOC_TYPE_LABELS } from '@/utils/constants';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  materialId: string;
}

export function UploadDocumentDialog({ open, onOpenChange, contractId, materialId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>('CERTIFICATE');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Файл не выбран');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', docType);

      const res = await fetch(
        `/api/contracts/${contractId}/materials/${materialId}/documents`,
        { method: 'POST', body: formData }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', contractId] });
      queryClient.invalidateQueries({ queryKey: ['material-documents', materialId] });
      toast({ title: 'Документ загружен' });
      setFile(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка загрузки', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Загрузить документ</DialogTitle>
          <DialogDescription className="sr-only">
            Выберите тип документа и прикрепите файл паспорта, сертификата или протокола
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Тип документа</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MATERIAL_DOC_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Файл (PDF)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {file ? file.name : 'Выбрать файл'}
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!file || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Загрузка...' : 'Загрузить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
