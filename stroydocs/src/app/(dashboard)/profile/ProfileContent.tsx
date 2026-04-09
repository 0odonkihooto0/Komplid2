'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import { formatRole } from '@/utils/format';
import type { UserRole } from '@prisma/client';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string;
  phone: string | null;
  position: string | null;
  role: UserRole;
  organization: { id: string; name: string; address: string | null };
}

const profileSchema = z.object({
  lastName: z.string().min(1, 'Обязательное поле'),
  firstName: z.string().min(1, 'Обязательное поле'),
  middleName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

export function ProfileContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/profile');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset({
        lastName: profile.lastName,
        firstName: profile.firstName,
        middleName: profile.middleName ?? '',
        phone: profile.phone ?? '',
        position: profile.position ?? '',
      });
    }
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: 'Профиль обновлён' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!profile) return <p className="text-muted-foreground">Профиль не найден</p>;

  const initials = `${profile.lastName[0]}${profile.firstName[0]}`.toUpperCase();

  return (
    <div className="max-w-2xl space-y-6">
      {/* Аватар и базовая информация */}
      <Card>
        <CardContent className="flex items-center gap-6 pt-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{profile.lastName} {profile.firstName} {profile.middleName}</h1>
            <p className="text-sm text-muted-foreground">{formatRole(profile.role)}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Редактируемые поля */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Личные данные</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="firstName">Имя</Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="middleName">Отчество</Label>
              <Input id="middleName" {...register('middleName')} placeholder="Необязательно" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="position">Должность</Label>
              <Input id="position" {...register('position')} placeholder="Инженер ПТО" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" {...register('phone')} placeholder="+7 (999) 000-00-00" />
            </div>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Организация */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Работаю в</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{profile.organization.name}</p>
              {profile.organization.address && (
                <p className="text-sm text-muted-foreground">{profile.organization.address}</p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/organizations')}>
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Управление организацией
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
