'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const inviteSchema = z.object({
  firstName: z.string().min(1, 'Введите имя'),
  lastName: z.string().min(1, 'Введите фамилию'),
  password: z.string().min(6, 'Минимум 6 символов'),
});

type InviteInput = z.infer<typeof inviteSchema>;

interface InviteDetails {
  email: string;
  organizationName: string;
  role: string;
}

export function useInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { firstName: '', lastName: '', password: '' },
  });

  useEffect(() => {
    if (!token) {
      setError('Ссылка приглашения недействительна');
      setIsFetching(false);
      return;
    }

    fetch(`/api/invitations/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setInvite(data.data);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError('Не удалось загрузить приглашение'))
      .finally(() => setIsFetching(false));
  }, [token]);

  const onSubmit = async (data: InviteInput) => {
    if (!token) return;
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...data }),
      });
      const result = await res.json();

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Автологин
      const signInResult = await signIn('credentials', {
        email: invite?.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push('/login');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return { form, invite, error, isLoading, isFetching, onSubmit };
}
