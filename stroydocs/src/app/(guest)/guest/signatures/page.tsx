'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Loader2, ArrowLeft, FileCheck, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface GuestSignature {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED';
  method: string;
  createdAt: string;
  confirmedAt: string | null;
  document: {
    id: string;
    title: string;
    type: string;
  } | null;
}

// Метки и стили для статусов подписи
const STATUS_CONFIG: Record<GuestSignature['status'], { label: string; className: string; icon: typeof Clock }> = {
  PENDING: { label: 'Ожидает кода', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  CONFIRMED: { label: 'Подтверждена', className: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  REJECTED: { label: 'Отклонена', className: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  EXPIRED: { label: 'Истекла', className: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle },
};

// Форматирование даты в русской локали
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function GuestSignaturesPage() {
  // История подписей текущего гостя
  const { data: signatures, isLoading } = useQuery<GuestSignature[]>({
    queryKey: ['guest-signatures'],
    queryFn: async () => {
      const res = await fetch('/api/guest/signatures');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ссылка назад */}
      <Link href="/guest" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Главная
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">История подписей</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Документы, которые вы подписали или инициировали подпись
        </p>
      </div>

      {/* Список подписей */}
      {!signatures || signatures.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">Подписей пока нет</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {signatures.map((sig) => {
            const cfg = STATUS_CONFIG[sig.status];
            const Icon = cfg.icon;

            return (
              <Card key={sig.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base font-medium leading-tight">
                      {sig.document?.title ?? 'Документ не найден'}
                    </CardTitle>
                    <Badge className={cfg.className}>
                      <Icon className="h-3 w-3 mr-1" />
                      {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium text-foreground">Инициировано:</span>{' '}
                    {fmtDate(sig.createdAt)}
                  </p>
                  {sig.confirmedAt && (
                    <p>
                      <span className="font-medium text-foreground">Подтверждено:</span>{' '}
                      {fmtDate(sig.confirmedAt)}
                    </p>
                  )}
                  <p>
                    <span className="font-medium text-foreground">Метод:</span>{' '}
                    {sig.method === 'SMS' ? 'СМС' : sig.method === 'EMAIL_CONFIRM' ? 'Email' : sig.method}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
