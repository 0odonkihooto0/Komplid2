'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useInviteForm } from './useInviteForm';

// Центрированный враппер для формы приглашения
function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">StroyDocs</h1>
          <p className="text-sm text-muted-foreground">Платформа исполнительной документации</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function InviteForm() {
  const { form, invite, error, isLoading, isFetching, onSubmit } = useInviteForm();
  const { register, handleSubmit, formState: { errors } } = form;

  if (isFetching) {
    return (
      <Centered>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </Centered>
    );
  }

  if (error && !invite) {
    return (
      <Centered>
        <Card>
          <CardHeader>
            <CardTitle>Ошибка приглашения</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </Centered>
    );
  }

  return (
    <Centered>
    <Card>
      <CardHeader>
        <CardTitle>Принять приглашение</CardTitle>
        {invite && (
          <CardDescription>
            Вас пригласили в организацию «{invite.organizationName}»
          </CardDescription>
        )}
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {invite && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p>Email: <strong>{invite.email}</strong></p>
              <p>Роль: <strong>{invite.role}</strong></p>
            </div>
          )}
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
            <Label htmlFor="password">Придумайте пароль</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Создание аккаунта...' : 'Принять приглашение'}
          </Button>
        </CardFooter>
      </form>
    </Card>
    </Centered>
  );
}
