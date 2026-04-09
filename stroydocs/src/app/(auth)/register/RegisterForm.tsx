'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegisterForm } from './useRegisterForm';

const FEATURES = [
  '1 проект бесплатно — без ограничений по времени',
  'Генерация АОСР, ОЖР и актов технической готовности',
  'Учёт материалов и входной контроль (ЖВК)',
  'Согласование документов с ЭЦП',
];

export function RegisterForm() {
  const { form, error, isLoading, onSubmit } = useRegisterForm();
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <div className="flex min-h-screen">
      {/* Левая панель — маркетинговая (скрыта на мобильных) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 text-white">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">StroyDocs</h1>
          <p className="mt-2 text-primary-foreground/80">
            Начните бесплатно — без карты и звонков
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

      {/* Правая панель — форма регистрации */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-muted/30 px-8 py-10">
        <div className="w-full max-w-md space-y-6">
          {/* Логотип для мобильных */}
          <div className="text-center lg:hidden">
            <h1 className="text-2xl font-bold text-primary">StroyDocs</h1>
            <p className="text-sm text-muted-foreground">Платформа исполнительной документации</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Регистрация организации</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Название организации</Label>
                  <Input id="organizationName" placeholder='ООО "Компания"' {...register('organizationName')} />
                  {errors.organizationName && (
                    <p className="text-xs text-destructive">{errors.organizationName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inn">ИНН</Label>
                  <Input id="inn" placeholder="7707083893" {...register('inn')} />
                  {errors.inn && <p className="text-xs text-destructive">{errors.inn.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input id="lastName" {...register('lastName')} />
                    {errors.lastName && (
                      <p className="text-xs text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Имя</Label>
                    <Input id="firstName" {...register('firstName')} />
                    {errors.firstName && (
                      <p className="text-xs text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="email@company.ru" {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
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
                  {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Уже есть аккаунт?{' '}
                  <Link href="/login" className="text-primary hover:underline">
                    Войти
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
