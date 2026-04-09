'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoginForm } from './useLoginForm';

const FEATURES = [
  'Автоматическое АОСР за 30 секунд',
  'Диаграмма Ганта с критическим путём',
  'ЭЦП и многоуровневые маршруты согласования',
  'Дефектовка с GPS и фотофиксацией',
];

export function LoginForm() {
  const { form, error, isLoading, onSubmit } = useLoginForm();
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <div className="flex min-h-screen">
      {/* Левая панель — маркетинговая (скрыта на мобильных) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 text-white">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">StroyDocs</h1>
          <p className="mt-2 text-primary-foreground/80">
            Вся ИД — за минуты, а не недели
          </p>
        </div>
        <div className="space-y-5">
          {FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 shrink-0 text-green-300" />
              <span className="text-base">{feature}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-primary-foreground/50">
          © 2026 StroyDocs. Все данные хранятся в РФ (ФЗ-152).
        </p>
      </div>

      {/* Правая панель — форма входа */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-muted/30 px-8">
        <div className="w-full max-w-md space-y-6">
          {/* Логотип для мобильных */}
          <div className="text-center lg:hidden">
            <h1 className="text-2xl font-bold text-primary">StroyDocs</h1>
            <p className="text-sm text-muted-foreground">Платформа исполнительной документации</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Вход в систему</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="email@company.ru" {...register('email')} />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input id="password" type="password" {...register('password')} />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Вход...' : 'Войти'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Нет аккаунта?{' '}
                  <Link href="/register" className="text-primary hover:underline">
                    Зарегистрироваться
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
