'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { KsiTreePicker } from '@/components/modules/ksi/KsiTreePicker';
import { createWorkItemSchema, type CreateWorkItemInput } from '@/lib/validations/work-item';
import { useWorkItems } from './useWorkItems';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
}

export function CreateWorkItemDialog({ open, onOpenChange, contractId }: Props) {
  const { createMutation } = useWorkItems(contractId);
  const [selectedKsi, setSelectedKsi] = useState<{ code: string; name: string } | null>(null);
  const [withKsi, setWithKsi] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateWorkItemInput>({
    resolver: zodResolver(createWorkItemSchema),
  });

  const onSubmit = (data: CreateWorkItemInput) => {
    // Если КСИ не выбран — очищаем ksiNodeId
    const payload = withKsi ? data : { ...data, ksiNodeId: undefined };
    createMutation.mutate(payload, {
      onSuccess: () => {
        reset();
        setSelectedKsi(null);
        setWithKsi(false);
        onOpenChange(false);
      },
    });
  };

  const handleWithKsiChange = (checked: boolean) => {
    setWithKsi(checked);
    if (!checked) {
      setValue('ksiNodeId', undefined);
      setSelectedKsi(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Добавить вид работ</DialogTitle>
          <DialogDescription className="sr-only">Добавьте новый вид работ с опциональной привязкой к классификатору КСИ</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Шифр проекта *</Label>
            <Input {...register('projectCipher')} placeholder="Например: 01-КР" />
            {errors.projectCipher && (
              <p className="text-sm text-destructive">{errors.projectCipher.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Наименование работы *</Label>
            <Input {...register('name')} placeholder="Наименование вида работ" />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Описание</Label>
            <Input {...register('description')} placeholder="Краткое описание" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="withKsi"
                checked={withKsi}
                onCheckedChange={(v) => handleWithKsiChange(v === true)}
              />
              <Label htmlFor="withKsi" className="cursor-pointer font-normal">
                Привязать к классификатору КСИ
              </Label>
            </div>

            {withKsi && (
              <div className="space-y-2">
                {selectedKsi && (
                  <p className="text-sm text-muted-foreground">
                    Выбрано: <span className="font-mono">{selectedKsi.code}</span> — {selectedKsi.name}
                  </p>
                )}
                <KsiTreePicker
                  value={undefined}
                  onSelect={(nodeId, node) => {
                    setValue('ksiNodeId', nodeId, { shouldValidate: true });
                    setSelectedKsi({ code: node.code, name: node.name });
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
