'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { soloRegisterSchema } from '@/lib/validations/auth';
import type { SoloRegisterInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/useToast';

export default function SoloRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SoloRegisterInput>({
    resolver: zodResolver(soloRegisterSchema),
  });

  const onSubmit = async (data: SoloRegisterInput) => {
    if (!agreed) {
      toast({ title: 'Примите условия оферты', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register-solo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: json.error ?? 'Ошибка регистрации', variant: 'destructive' });
        return;
      }
      // Автологин после регистрации → онбординг
      await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: true,
        callbackUrl: '/onboarding/role',
      });
    } catch {
      toast({ title: 'Ошибка сети', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Регистрация специалиста</CardTitle>
          <CardDescription>
            Создайте личный аккаунт без привязки к организации
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="firstName">Имя</Label>
                <Input id="firstName" {...register('firstName')} placeholder="Иван" />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input id="lastName" {...register('lastName')} placeholder="Иванов" />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="ivan@example.com" />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" {...register('password')} placeholder="Минимум 6 символов" />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
              />
              <Label htmlFor="agree" className="text-sm font-normal leading-tight cursor-pointer">
                Я принимаю{' '}
                <Link href="/docs/offer" className="text-primary underline" target="_blank">
                  условия оферты
                </Link>
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2 text-sm text-muted-foreground">
            <p>
              Есть аккаунт?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Войти
              </Link>
            </p>
            <p>
              Регистрация компании?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Создать организацию
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
