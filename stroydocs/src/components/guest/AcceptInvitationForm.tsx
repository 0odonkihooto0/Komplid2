'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Building2, CheckCircle2, AlertCircle, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InvitationDetails {
  workspaceName: string;
  inviterName: string;
  guestEmail: string;
  projectNames: string[];
  expiresAt: string;
}

interface AcceptInvitationFormProps {
  token: string;
}

/**
 * Форма принятия гостевого приглашения.
 * Показывает информацию об приглашении и кнопку принятия.
 */
export default function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  // Загружаем детали приглашения по токену
  const { data: invitation, isLoading, isError } = useQuery<InvitationDetails>({
    queryKey: ['guest-invitation', token],
    queryFn: async () => {
      const res = await fetch(`/api/public/guest-accept/${token}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Приглашение не найдено');
      return json.data;
    },
    retry: false,
  });

  // Мутация принятия приглашения
  const { mutate: acceptInvitation, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/guest-accept/${token}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Не удалось принять приглашение');
      return json.data;
    },
    onSuccess: () => {
      setAccepted(true);
      // После принятия перенаправляем на логин с callbackUrl для гостевого кабинета
      setTimeout(() => {
        router.push('/login?callbackUrl=/guest&message=invitation_accepted');
      }, 2000);
    },
  });

  // Состояние загрузки
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Ошибка или истёкший токен
  if (isError || !invitation) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Приглашение недействительно</CardTitle>
          <CardDescription>
            Ссылка устарела или уже была использована. Запросите новое приглашение у организатора.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={() => router.push('/login')}>
            Войти в систему
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Успешное принятие
  if (accepted) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Приглашение принято!</CardTitle>
          <CardDescription>
            Перенаправляем вас на страницу входа...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Основная форма с деталями приглашения
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
          <Building2 className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle>Гостевое приглашение</CardTitle>
        <CardDescription>
          Вас приглашают в рабочее пространство StroyDocs
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Рабочее пространство */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Организация</p>
              <p className="text-sm font-medium">{invitation.workspaceName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Пригласил</p>
              <p className="text-sm font-medium">{invitation.inviterName}</p>
            </div>
          </div>
        </div>

        {/* Список объектов строительства */}
        {invitation.projectNames.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Доступные объекты</p>
            <div className="flex flex-wrap gap-1.5">
              {invitation.projectNames.map((name) => (
                <Badge key={name} variant="secondary" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Email гостя */}
        <p className="text-xs text-center text-muted-foreground">
          Приглашение отправлено на: <span className="font-medium">{invitation.guestEmail}</span>
        </p>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={() => acceptInvitation()}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Принимаем приглашение...
            </>
          ) : (
            'Принять приглашение'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
