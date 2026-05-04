export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Статусы претензии на русском
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  SENT: 'Отправлена',
  IN_REVIEW: 'На рассмотрении',
  RESOLVED: 'Урегулирована',
  REJECTED: 'Отклонена',
};

// Типы претензий на русском
const TYPE_LABELS: Record<string, string> = {
  QUALITY_ISSUE: 'Нарушение качества',
  DELAY: 'Нарушение сроков',
  OVERBILLING: 'Завышение стоимости',
  MISSING_DOCUMENTS: 'Отсутствие документов',
  WARRANTY_VIOLATION: 'Нарушение гарантии',
  PRE_COURT: 'Досудебная претензия',
  CONTRACT_TERMINATION: 'Расторжение договора',
};

interface Claim {
  id: string;
  title?: string;
  claimType: string;
  status: string;
  createdAt: string;
}

interface Props {
  params: { projectId: string };
}

export default async function ClaimsPage({ params }: Props) {
  // Загрузка списка претензий по проекту
  let claims: Claim[] = [];
  let fetchError = false;

  try {
    const res = await fetch(
      `${process.env.APP_URL ?? 'http://localhost:3000'}/api/customer/projects/${params.projectId}/claims`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const json: { success: boolean; data: Claim[] } = await res.json();
      if (json.success) claims = json.data;
    } else {
      fetchError = true;
    }
  } catch {
    fetchError = true;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Претензии</h1>
        <Button asChild>
          <Link href={`/moy-remont/projects/${params.projectId}/claims/new`}>
            Новая претензия
          </Link>
        </Button>
      </div>

      {fetchError && (
        <p className="text-sm text-destructive">Не удалось загрузить список претензий.</p>
      )}

      {!fetchError && claims.length === 0 && (
        <div className="border border-dashed rounded-lg p-10 text-center">
          <p className="text-muted-foreground text-sm mb-4">Претензий пока нет.</p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/moy-remont/projects/${params.projectId}/claims/new`}>
              Создать первую претензию
            </Link>
          </Button>
        </div>
      )}

      {claims.length > 0 && (
        <div className="space-y-2">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="flex items-center justify-between border rounded-lg px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
            >
              <div className="space-y-0.5">
                <p className="font-medium">
                  {claim.title ?? TYPE_LABELS[claim.claimType] ?? claim.claimType}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(claim.createdAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <Badge variant="outline">
                {STATUS_LABELS[claim.status] ?? claim.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
