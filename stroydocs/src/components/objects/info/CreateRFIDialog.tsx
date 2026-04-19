'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { z } from 'zod';

const formSchema = z.object({
  title: z.string().min(3, 'Введите краткое описание').max(200),
  description: z.string().min(10, 'Введите подробное описание'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  deadlineDate: z.string().optional(),
  assigneeId: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
}

export function CreateRFIDialog({ open, onOpenChange, objectId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['org-employees'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/employees');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', description: '', priority: 'MEDIUM', deadlineDate: '', assigneeId: '' },
  });

  const close = () => {
    form.reset();
    onOpenChange(false);
  };

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        deadline: values.deadlineDate ? new Date(values.deadlineDate).toISOString() : undefined,
        assigneeId: values.assigneeId || undefined,
      };
      const res = await fetch(`/api/projects/${objectId}/rfi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка создания запроса');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfi', objectId] });
      toast({ title: 'Запрос создан' });
      close();
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Новый запрос на разъяснение (RFI)</DialogTitle>
          <DialogDescription className="sr-only">Создание вопроса RFI</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Краткое описание *</Label>
            <Input placeholder="Уточнение конструктива..." {...form.register('title')} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Подробное описание *</Label>
            <Textarea rows={4} placeholder="Опишите вопрос подробно..." {...form.register('description')} />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select
                value={form.watch('priority')}
                onValueChange={(v) => form.setValue('priority', v as FormValues['priority'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Низкий</SelectItem>
                  <SelectItem value="MEDIUM">Средний</SelectItem>
                  <SelectItem value="HIGH">Высокий</SelectItem>
                  <SelectItem value="URGENT">Срочный</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Срок ответа</Label>
              <Input type="date" {...form.register('deadlineDate')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Исполнитель</Label>
            <Select
              value={form.watch('assigneeId') ?? ''}
              onValueChange={(v) => form.setValue('assigneeId', v)}
            >
              <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.lastName} {e.firstName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>Отмена</Button>
          <Button
            disabled={createMutation.isPending}
            onClick={() => form.handleSubmit((v) => createMutation.mutate(v))()}
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
