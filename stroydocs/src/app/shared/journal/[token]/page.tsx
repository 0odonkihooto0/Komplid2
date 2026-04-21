import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Building2, Calendar, AlertCircle, User } from 'lucide-react';
import { db } from '@/lib/db';

const TYPE_LABELS: Record<string, string> = {
  CONCRETE_WORKS: 'Журнал бетонных работ',
  WELDING_WORKS: 'Журнал сварочных работ',
  AUTHOR_SUPERVISION: 'Журнал авторского надзора',
  MOUNTING_WORKS: 'Журнал монтажных работ',
  ANTICORROSION: 'Журнал антикоррозионной защиты',
  GEODETIC: 'Оперативный журнал',
  EARTHWORKS: 'Журнал земляных работ',
  PILE_DRIVING: 'Журнал погружения свай',
  CABLE_LAYING: 'Журнал прокладки кабеля',
  FIRE_SAFETY: 'Журнал инструктажа по ПБ',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активен',
  CLOSED: 'Закрыт',
  ARCHIVED: 'В архиве',
};

async function getJournal(token: string) {
  return db.specialJournal.findUnique({
    where: { publicShareToken: token },
    select: {
      id: true,
      type: true,
      number: true,
      title: true,
      status: true,
      openedAt: true,
      publicShareExpiresAt: true,
      publicShareViewCount: true,
      responsible: { select: { firstName: true, lastName: true } },
      project: { select: { name: true } },
      entries: {
        orderBy: { date: 'desc' },
        take: 20,
        select: {
          id: true,
          date: true,
          entryNumber: true,
          description: true,
          location: true,
        },
      },
    },
  });
}

interface Props {
  params: { token: string };
}

export default async function SharedJournalPage({ params }: Props) {
  const journal = await getJournal(params.token);

  if (!journal) notFound();

  if (journal.publicShareExpiresAt && new Date() > journal.publicShareExpiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="text-center space-y-2">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="text-xl font-semibold">Ссылка больше недействительна</p>
          <p className="text-muted-foreground">Срок действия этой публичной ссылки истёк.</p>
          <Link href="/" className="text-primary hover:underline text-sm">
            Перейти в StroyDocs →
          </Link>
        </div>
      </div>
    );
  }

  // Обновляем счётчик просмотров (fire-and-forget)
  db.specialJournal
    .update({
      where: { id: journal.id },
      data: { publicShareViewCount: journal.publicShareViewCount + 1 },
    })
    .catch(() => void 0);

  const typeLabel = TYPE_LABELS[journal.type] ?? journal.type;
  const statusLabel = STATUS_LABELS[journal.status] ?? journal.status;
  const responsibleName = `${journal.responsible.firstName} ${journal.responsible.lastName}`.trim();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Шапка */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold text-primary">StroyDocs</span>
        </div>
        <Link href="/register" className="text-sm text-primary hover:underline">
          Зарегистрироваться бесплатно →
        </Link>
      </header>

      <main className="max-w-2xl mx-auto py-10 px-4 space-y-6">
        {/* Карточка журнала */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{typeLabel}</p>
            <h1 className="text-xl font-bold mt-1">{journal.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              № {journal.number} · {statusLabel}
            </p>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Объект:</span>
              <span className="font-medium">{journal.project.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Ответственный:</span>
              <span className="font-medium">{responsibleName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Открыт:</span>
              <span className="font-medium">
                {new Date(journal.openedAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        </div>

        {/* Последние записи */}
        {journal.entries.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <h2 className="font-semibold">
              Последние записи ({journal.entries.length})
            </h2>
            <div className="divide-y">
              {journal.entries.map((entry) => (
                <div key={entry.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      № {entry.entryNumber} · {new Date(entry.date).toLocaleDateString('ru-RU')}
                    </span>
                    {entry.location && (
                      <span className="text-xs text-muted-foreground">{entry.location}</span>
                    )}
                  </div>
                  <p className="text-sm line-clamp-3">{entry.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Промо Прораб-Журнал */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm space-y-2">
          <p className="font-semibold text-green-900">Ведёте ОЖР с телефона?</p>
          <p className="text-green-700">
            Прораб-Журнал позволяет вести записи голосом, прикреплять фото с GPS и работать без
            интернета. 14 дней бесплатно, без привязки карты.
          </p>
          <Link
            href="/register?ref=shared_journal&role=FOREMAN"
            className="inline-flex items-center font-medium text-green-800 hover:underline"
          >
            Попробовать Прораб-Журнал →
          </Link>
        </div>

        {/* Промо ИД-Мастер (вирусный мост к ПТО) */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm space-y-2">
          <p className="font-semibold text-blue-900">Вы ПТО-инженер?</p>
          <p className="text-blue-700">
            С ИД-Мастер можно генерировать АОСР из записей этого журнала автоматически.
            Загружайте ОЖР и создавайте исполнительную документацию за минуты.
          </p>
          <Link
            href="/register?ref=shared_journal&role=PTO"
            className="inline-flex items-center font-medium text-blue-800 hover:underline"
          >
            Попробовать ИД-Мастер 14 дней бесплатно →
          </Link>
        </div>
      </main>
    </div>
  );
}
