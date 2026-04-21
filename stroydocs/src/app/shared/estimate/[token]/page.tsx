import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Building2, FileText, ArrowRight } from 'lucide-react';

interface Chapter {
  id: string;
  name: string;
  code: string | null;
  order: number;
  level: number;
  items: Item[];
}

interface Item {
  id: string;
  name: string;
  unit: string | null;
  volume: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  sortOrder: number;
}

async function getEstimate(token: string) {
  const version = await db.estimateVersion.findUnique({
    where: { publicShareToken: token },
    select: {
      id: true,
      name: true,
      totalAmount: true,
      publicShareExpiresAt: true,
      contract: {
        select: {
          number: true,
          buildingObject: { select: { name: true } },
        },
      },
      chapters: {
        select: {
          id: true,
          name: true,
          code: true,
          order: true,
          level: true,
          items: {
            select: {
              id: true,
              name: true,
              unit: true,
              volume: true,
              unitPrice: true,
              totalPrice: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: 'asc' },
            take: 200,
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });
  return version;
}

interface Props {
  params: { token: string };
}

export default async function SharedEstimatePage({ params }: Props) {
  const version = await getEstimate(params.token);

  if (!version) notFound();
  if (version.publicShareExpiresAt && new Date() > version.publicShareExpiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="text-center">
          <p className="text-xl font-semibold">Ссылка больше недействительна</p>
          <p className="text-muted-foreground mt-2">Срок действия этой публичной ссылки истёк.</p>
        </div>
      </div>
    );
  }

  // Инкрементировать просмотры (fire-and-forget, без ожидания)
  db.estimateVersion
    .update({
      where: { publicShareToken: params.token },
      data: { publicShareViewCount: { increment: 1 } },
    })
    .catch(() => {});

  const fmt = (n: number | null | undefined) =>
    n != null ? n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '—';

  return (
    <div className="min-h-screen bg-background">
      {/* Шапка */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-bold text-primary">StroyDocs</span>
          </div>
          <Link
            href={`/register/solo?utm_source=share&utm_medium=estimate`}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Попробовать бесплатно
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Мета-информация */}
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <FileText className="h-6 w-6 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">{version.name}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {version.contract.buildingObject.name}
                {version.contract.number ? ` · Договор №${version.contract.number}` : ''}
              </p>
            </div>
          </div>

          {version.totalAmount != null && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
              <span className="text-sm text-muted-foreground">Итого:</span>
              <span className="font-bold text-lg">
                {fmt(version.totalAmount)} ₽
              </span>
            </div>
          )}
        </div>

        {/* Таблица разделов и позиций */}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium w-[50%]">Наименование</th>
                <th className="text-center px-3 py-2 font-medium w-[8%]">Ед.</th>
                <th className="text-right px-3 py-2 font-medium w-[12%]">Кол-во</th>
                <th className="text-right px-3 py-2 font-medium w-[15%]">Цена ед.</th>
                <th className="text-right px-3 py-2 font-medium w-[15%]">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {(version.chapters as Chapter[]).map((chapter) => (
                <>
                  <tr key={`ch-${chapter.id}`} className="bg-muted/30">
                    <td
                      colSpan={5}
                      className="px-3 py-2 font-semibold"
                      style={{ paddingLeft: `${(chapter.level + 1) * 12}px` }}
                    >
                      {chapter.code ? `${chapter.code}. ` : ''}{chapter.name}
                    </td>
                  </tr>
                  {chapter.items.map((item) => (
                    <tr key={item.id} className="border-t hover:bg-muted/20">
                      <td className="px-3 py-2 pl-8">{item.name}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{item.unit ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{fmt(item.volume)}</td>
                      <td className="px-3 py-2 text-right">{fmt(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(item.totalPrice)}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-xl border bg-primary/5 p-6 text-center">
          <p className="font-semibold text-lg">Хотите такой же инструмент?</p>
          <p className="text-muted-foreground text-sm mt-1">
            StroyDocs — профессиональная платформа для строительной документации
          </p>
          <Link
            href={`/register/solo?utm_source=share&utm_medium=estimate`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Попробовать 14 дней бесплатно
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
