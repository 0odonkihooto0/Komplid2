'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import { toast } from '@/hooks/useToast';

const PLAN_NAMES: Record<string, string> = {
  smetchik_studio: 'Сметчик-Студио',
  id_master: 'ИД-Мастер',
  prorab_journal: 'Прораб-Журнал',
  team: 'Team',
  corporate: 'Corporate',
};

interface SignupFormProps {
  intent?: string;
  planCode?: string;
  referredByCode?: string;
}

export function SignupForm({ planCode }: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', password: '', agreedToTerms: false },
  });
  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const agreedToTerms = watch('agreedToTerms');

  const submitLabel = planCode && PLAN_NAMES[planCode]
    ? `Создать аккаунт и начать ${PLAN_NAMES[planCode]}`
    : 'Создать аккаунт';

  async function onSubmit(data: SignupInput) {
    setIsLoading(true);
    setServerError(null);
    try {
      const res = await fetch('/api/auth/register-solo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password, firstName: data.firstName, lastName: data.lastName, phone: data.phone }),
      });
      const json = await res.json();
      if (!json.success) {
        setServerError(json.error ?? 'Ошибка при регистрации');
        return;
      }
      await signIn('credentials', { email: data.email, password: data.password, callbackUrl: '/onboarding/role' });
    } catch {
      toast({ title: 'Ошибка сети', description: 'Не удалось подключиться к серверу', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Создать аккаунт</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="email@company.ru" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон <span className="text-muted-foreground">(необязательно)</span></Label>
            <Input id="phone" type="tel" placeholder="+7 (___) ___-__-__" {...register('phone')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="agreedToTerms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setValue('agreedToTerms', checked, { shouldValidate: true })}
            />
            <Label htmlFor="agreedToTerms" className="cursor-pointer text-sm leading-snug text-muted-foreground">
              Принимаю{' '}
              <Link href="/legal/oferta" className="text-primary hover:underline" target="_blank">условия оферты</Link>
              {' '}и{' '}
              <Link href="/legal/privacy" className="text-primary hover:underline" target="_blank">политику конфиденциальности</Link>
            </Label>
          </div>
          {errors.agreedToTerms && (
            <p className="text-xs text-destructive">{errors.agreedToTerms.message}</p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Создаём аккаунт...' : submitLabel}
          </Button>
          <p className="text-sm text-muted-foreground">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-primary hover:underline">Войти</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
