'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';

const schema = z.object({
  name: z.string().min(1, 'Введите название').max(100, 'Слишком длинное название'),
});
type FormData = z.infer<typeof schema>;

export function NewWorkspaceContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/onboarding/create-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, specializations: [] }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { workspaceId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-workspaces'] });
      // Переключаем на новый workspace
      fetch('/api/user/active-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: data.workspaceId }),
      }).finally(() => {
        toast({ title: 'Рабочее пространство создано' });
        router.push('/objects');
        router.refresh();
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Новое рабочее пространство</h1>
          <p className="text-sm text-muted-foreground">Для другой компании или проекта</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Данные пространства</CardTitle>
          <CardDescription>
            Вы станете владельцем нового рабочего пространства
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Название компании или команды</Label>
              <Input
                id="name"
                placeholder="ООО Стройка+"
                autoFocus
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать рабочее пространство'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
