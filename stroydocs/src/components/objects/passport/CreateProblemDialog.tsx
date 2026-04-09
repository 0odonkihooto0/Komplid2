'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProblemIssueType } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PROBLEM_TYPE_LABELS } from './ProblemsView';
import { useCreateProblemIssue } from './useProblemIssues';

const schema = z.object({
  type:        z.nativeEnum(ProblemIssueType),
  description: z.string().min(1, 'Заполните описание').max(2000),
  responsible: z.string().max(200).optional(),
  deadline:    z.string().optional(), // YYYY-MM-DD из <input type="date">
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreateProblemDialog({ open, onOpenChange, projectId }: Props) {
  const createMutation = useCreateProblemIssue(projectId);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: ProblemIssueType.OTHER, description: '', responsible: '', deadline: '' },
  });

  function onSubmit(values: FormValues) {
    // Конвертируем YYYY-MM-DD → ISO datetime для API
    const deadline = values.deadline ? new Date(values.deadline).toISOString() : undefined;

    createMutation.mutate(
      { type: values.type, description: values.description, responsible: values.responsible || undefined, deadline },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Новый проблемный вопрос</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Тип</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ProblemIssueType).map((t) => (
                      <SelectItem key={t} value={t}>
                        {PROBLEM_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label>Описание</Label>
            <Textarea {...register('description')} rows={4} placeholder="Опишите проблемный вопрос" />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Ответственный</Label>
            <Input {...register('responsible')} placeholder="ФИО или организация" />
          </div>

          <div className="space-y-1">
            <Label>Срок</Label>
            <Input type="date" {...register('deadline')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Сохранение...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
