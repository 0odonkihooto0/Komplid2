import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FileText, Building2, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { db } from '@/lib/db';

const TYPE_LABELS: Record<string, string> = {
  AOSR: 'Акт освидетельствования скрытых работ',
  OZR: 'Общий журнал работ',
  TECHNICAL_READINESS_ACT: 'Акт технической готовности',
  GENERAL_DOCUMENT: 'Документ',
  KS_6A: 'КС-6а',
  KS_11: 'КС-11',
  KS_14: 'КС-14',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  DRAFT:     { label: 'Черновик',     color: 'text-gray-500',  Icon: Clock },
  IN_REVIEW: { label: 'На проверке',  color: 'text-blue-600',  Icon: Clock },
  SIGNED:    { label: 'Подписан',     color: 'text-green-600', Icon: CheckCircle2 },
  REJECTED:  { label: 'Отклонён',     color: 'text-red-600',   Icon: XCircle },
};

async function getDoc(token: string) {
  return db.executionDoc.findUnique({
    where: { publicShareToken: token },
    select: {
      id: true,
      type: true,
      status: true,
      number: true,
      title: true,
      documentDate: true,
      note: true,
      publicShareExpiresAt: true,
      publicShareViewCount: true,
      contract: {
        select: {
          number: true,
          name: true,
          buildingObject: { select: { name: true } },
        },
      },
    },
  });
}

interface Props {
  params: { token: string };
}

export default async function SharedExecutionDocPage({ params }: Props) {
  const doc = await getDoc(params.token);

  if (!doc) notFound();

  if (doc.publicShareExpiresAt && new Date() > doc.publicShareExpiresAt) {
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
  db.executionDoc
    .update({
      where: { id: doc.id },
      data: { publicShareViewCount: doc.publicShareViewCount + 1 },
    })
    .catch(() => void 0);

  const typeLabel = TYPE_LABELS[doc.type] ?? doc.type;
  const statusCfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.DRAFT;
  const { Icon: StatusIcon } = statusCfg;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Шапка */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-semibold text-primary">StroyDocs</span>
        </div>
        <Link
          href="/register"
          className="text-sm text-primary hover:underline"
        >
          Зарегистрироваться бесплатно →
        </Link>
      </header>

      <main className="max-w-2xl mx-auto py-10 px-4 space-y-6">
        {/* Карточка документа */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{typeLabel}</p>
              <h1 className="text-xl font-bold mt-1">{doc.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">№ {doc.number}</p>
            </div>
            <div className={`flex items-center gap-1.5 ${statusCfg.color}`}>
              <StatusIcon className="h-4 w-4" />
              <span className="text-sm font-medium">{statusCfg.label}</span>
            </div>
          </div>

          {doc.documentDate && (
            <div className="text-sm text-muted-foreground">
              Дата: {new Date(doc.documentDate).toLocaleDateString('ru-RU')}
            </div>
          )}

          {/* Объект и договор */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Объект:</span>
              <span className="font-medium">{doc.contract.buildingObject.name}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground">Договор:</span>
              <span className="font-medium">
                № {doc.contract.number} — {doc.contract.name}
              </span>
            </div>
          </div>

          {doc.note && (
            <div className="border-t pt-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Примечание: </span>
              {doc.note}
            </div>
          )}
        </div>

        {/* Блок подписания */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-3">
          <h2 className="font-semibold">Подписание документа</h2>
          <p className="text-sm text-muted-foreground">
            Для подписания этого документа необходимо войти в StroyDocs или зарегистрироваться.
          </p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Войти и подписать
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              Зарегистрироваться бесплатно
            </Link>
          </div>
        </div>

        {/* Промо ИД-Мастер */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm space-y-2">
          <p className="font-semibold text-blue-900">
            Ведёте исполнительную документацию?
          </p>
          <p className="text-blue-700">
            Попробуйте ИД-Мастер — создавайте, согласовывайте и отправляйте АОСР за минуты.
            14 дней бесплатно, без привязки карты.
          </p>
          <Link
            href="/register?ref=shared_doc"
            className="inline-flex items-center font-medium text-blue-800 hover:underline"
          >
            Попробовать ИД-Мастер →
          </Link>
        </div>
      </main>
    </div>
  );
}
