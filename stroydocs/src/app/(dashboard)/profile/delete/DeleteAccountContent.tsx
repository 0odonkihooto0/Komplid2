'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/useToast';

const schema = z.object({
  password: z.string().min(1, 'Введите пароль'),
});
type FormData = z.infer<typeof schema>;

export function DeleteAccountContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const deleteMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/profile/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: data.password }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: async () => {
      await signOut({ redirect: false });
      router.push('/login?reason=account_deleted');
    },
    onError: (err: Error) => {
      setDialogOpen(false);
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const onConfirm = () => {
    const values = getValues();
    deleteMutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <Card className="border-destructive/40">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-base text-destructive">Удаление аккаунта</CardTitle>
          </div>
          <CardDescription>
            Это действие необратимо. Ваши личные данные будут анонимизированы,
            но созданные документы, фото и комментарии останутся в системе.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 mb-4">
            <ul className="text-sm text-destructive/90 space-y-1 list-disc pl-4">
              <li>Вы потеряете доступ ко всем рабочим пространствам</li>
              <li>Нельзя войти с этим email снова</li>
              <li>Данные нельзя восстановить</li>
              <li>Если вы единственный владелец — удаление заблокировано</li>
            </ul>
          </div>

          <form className="max-w-sm space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="delete-password">Введите пароль для подтверждения</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Ваш текущий пароль"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleSubmit(() => setDialogOpen(true))}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить аккаунт
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Аккаунт будет безвозвратно удалён. Восстановление невозможно.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={onConfirm}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Удаление...' : 'Да, удалить'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
