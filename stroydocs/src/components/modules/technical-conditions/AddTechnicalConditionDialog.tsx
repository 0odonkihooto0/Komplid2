'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTechnicalConditionSchema, TC_TYPES, type CreateTechnicalConditionInput } from '@/lib/validations/technical-condition';
import { useTechnicalConditions } from './useTechnicalConditions';
import type { LandPlot } from '@/components/modules/land-plots/useLandPlots';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
}

export function AddTechnicalConditionDialog({ open, onOpenChange, projectId }: Props) {
  const [customType, setCustomType] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { createMutation } = useTechnicalConditions(projectId);

  // Загрузка земельных участков для выбора
  const { data: landPlots = [] } = useQuery<LandPlot[]>({
    queryKey: ['land-plots', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/land-plots`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: open,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CreateTechnicalConditionInput>({
    resolver: zodResolver(createTechnicalConditionSchema),
  });

  const selectedType = watch('type');

  function handleTypeChange(val: string) {
    if (val === '__custom__') {
      setCustomType(true);
      setValue('type', '');
    } else {
      setCustomType(false);
      setValue('type', val);
    }
  }

  function handleLandPlotChange(val: string) {
    setValue('landPlotId', val === '__none__' ? null : val);
  }

  function handleClose() {
    reset();
    setCustomType(false);
    setPendingFile(null);
    onOpenChange(false);
  }

  async function onSubmit(data: CreateTechnicalConditionInput) {
    let s3Key: string | null = null;

    if (pendingFile) {
      setIsUploading(true);
      try {
        const urlRes = await fetch(`/api/projects/${projectId}/technical-conditions/presigned-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: pendingFile.name,
            mimeType: pendingFile.type || 'application/octet-stream',
          }),
        });
        const urlJson = await urlRes.json();
        if (!urlJson.success) throw new Error(urlJson.error);

        await fetch(urlJson.data.presignedUrl, {
          method: 'PUT',
          body: pendingFile,
          headers: { 'Content-Type': pendingFile.type || 'application/octet-stream' },
        });
        s3Key = urlJson.data.s3Key;
      } catch {
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    createMutation.mutate({ ...data, documentS3Key: s3Key }, { onSuccess: handleClose });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить технические условия</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Тип ТУ *</Label>
            <Select onValueChange={handleTypeChange} value={customType ? '__custom__' : (selectedType ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип..." />
              </SelectTrigger>
              <SelectContent>
                {TC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
                <SelectItem value="__custom__">Другое (ввести вручную)</SelectItem>
              </SelectContent>
            </Select>
            {customType && (
              <Input placeholder="Введите тип ТУ" {...register('type')} className="mt-1" />
            )}
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Земельный участок</Label>
            <Select onValueChange={handleLandPlotChange} defaultValue="__none__">
              <SelectTrigger>
                <SelectValue placeholder="Не выбран" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Не выбран</SelectItem>
                {landPlots.map((plot) => (
                  <SelectItem key={plot.id} value={plot.id}>{plot.cadastralNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Номер ТУ</Label>
              <Input placeholder="ТУ-2024-001" {...register('number')} />
            </div>
            <div className="space-y-1.5">
              <Label>Наличие условий подключения</Label>
              <Input placeholder="Да / Нет / Частично" {...register('connectionAvailability')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Дата выдачи</Label>
              <Input type="date" {...register('issueDate')} />
            </div>
            <div className="space-y-1.5">
              <Label>Дата окончания</Label>
              <Input type="date" {...register('expirationDate')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Выдавший орган</Label>
            <Input placeholder="Наименование организации" {...register('issuingAuthority')} />
          </div>

          <div className="space-y-1.5">
            <Label>Условия подключения</Label>
            <Textarea placeholder="Описание условий подключения..." rows={3} {...register('connectionConditions')} />
          </div>

          <div className="space-y-1.5">
            <Label>Файл ТУ</Label>
            <Input
              type="file"
              accept=".pdf,.docx,.xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPendingFile(file);
                  setValue('documentFileName', file.name);
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Отмена</Button>
            <Button type="submit" disabled={isUploading || createMutation.isPending}>
              {isUploading ? 'Загрузка...' : createMutation.isPending ? 'Сохранение...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
