import { notFound } from 'next/navigation';
import { CheckCircle, AlertTriangle, FileText, MapPin, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Публичная страница — без авторизации
// Заказчик видит прогресс объекта по уникальной ссылке

interface PortalData {
  projectId: string;
  projectName: string;
  address: string | null;
  generalContractor: string | null;
  customer: string | null;
  progress: number;
  docStats: { signed: number; total: number };
  contracts: { id: string; number: string; name: string; docsCount: number; workItemsCount: number }[];
  criticalDefects: { id: string; title: string; status: string; deadline: string | null; category: string }[];
  recentPhotos: { id: string; s3Key: string; fileName: string; createdAt: string }[];
}

const DEFECT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Устранён',
  CONFIRMED: 'Подтверждён',
};

async function getPortalData(token: string): Promise<PortalData | null> {
  try {
    const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const res = await fetch(`${appUrl}/api/portal/${token}`, { cache: 'no-store' });
    const json = await res.json();
    if (!json.success) return null;
    return json.data as PortalData;
  } catch {
    return null;
  }
}

export default async function PortalPage({ params }: { params: { token: string } }) {
  const data = await getPortalData(params.token);

  if (!data) {
    notFound();
  }

  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (data.progress / 100) * circumference;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Заголовок */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-xl font-bold text-primary">StroyDocs</span>
          <span className="text-sm text-muted-foreground">Портал заказчика</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Карточка проекта */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              {/* Круговой прогресс */}
              <div className="relative shrink-0">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold">{data.progress}%</span>
                  <span className="text-xs text-muted-foreground">ИД</span>
                </div>
              </div>

              {/* Информация об объекте */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{data.projectName}</h1>
                {data.address && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {data.address}
                  </p>
                )}
                {data.generalContractor && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    Генподрядчик: {data.generalContractor}
                  </p>
                )}
              </div>
            </div>

            {/* Метрики */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{data.docStats.signed}</p>
                <p className="text-xs text-muted-foreground">Подписано актов</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold">{data.docStats.total}</p>
                <p className="text-xs text-muted-foreground">Всего актов</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{data.criticalDefects.length}</p>
                <p className="text-xs text-muted-foreground">Открытых дефектов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Открытые дефекты */}
        {data.criticalDefects.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Открытые замечания
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.criticalDefects.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border p-3">
                    <p className="text-sm font-medium">{d.title}</p>
                    <Badge variant={d.status === 'OPEN' ? 'destructive' : 'secondary'}>
                      {DEFECT_STATUS_LABELS[d.status] ?? d.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Договоры */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              Договоры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.contracts.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{c.number} — {c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.workItemsCount} видов работ</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>{c.docsCount} актов</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Футер */}
      <footer className="border-t bg-white px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by{' '}
          <a href={process.env.APP_URL ?? '#'} className="text-primary hover:underline font-medium">
            StroyDocs
          </a>{' '}
          — платформа исполнительной документации
        </p>
      </footer>
    </div>
  );
}
