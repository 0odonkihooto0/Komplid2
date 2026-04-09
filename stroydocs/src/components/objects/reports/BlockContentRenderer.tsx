'use client';

import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type { ReportBlockType } from '@prisma/client';

// ─── Типы контента по типам блоков ───────────────────────────────────────────

type TitlePageContent = {
  objectName?: string; address?: string; generalContractor?: string;
  customer?: string; periodStart?: string | null; periodEnd?: string | null; permitNumber?: string;
};
type WorkVolumesContent = { rows?: Array<{ date: string; workName: string; unit: string; description: string }>; total?: number };
type Ks2ActsContent = { rows?: Array<{ number: string; periodStart: string; periodEnd: string; totalAmount: number; contractNumber: string; status: string }>; totalAmount?: number };
type IdStatusContent = { total?: number; byStatus?: Record<string, number>; readiness?: number };
type DefectsSummaryContent = { total?: number; byStatus?: Record<string, number>; byCategory?: Record<string, number>; overdue?: number };
type GprProgressContent = { tasks?: Array<{ name: string; planStart: string; planEnd: string; factStart?: string | null; factEnd?: string | null; progress: number; isCritical: boolean; deviationDays?: number | null }>; avgProgress?: number };
type PhotoReportContent = { photos?: Array<{ id: string; s3Key: string; fileName: string; takenAt?: string | null; category?: string | null }>; total?: number };
type FundingStatusContent = { sources?: Array<{ type: string; name: string; amount: number }>; totalFunding?: number; totalPaid?: number; balance?: number };
type DailyLogContent = { rows?: Array<{ date: string; weather: string; temperature?: number | null; workersCount?: number | null; notes: string }>; totalDays?: number };
type FreeTextContent = { html?: string };

// ─── Вспомогательные компоненты ───────────────────────────────────────────────

function TableWrapper({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((h) => (
              <th key={h} className="border px-2 py-1 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyBlock() {
  return (
    <p className="text-xs text-muted-foreground italic py-2">
      Блок пустой. Нажмите «Заполнить» для автоматической загрузки данных.
    </p>
  );
}

function fmt(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Рендеры по типу ─────────────────────────────────────────────────────────

function renderTitlePage(c: TitlePageContent) {
  return (
    <dl className="grid grid-cols-2 gap-1 text-sm">
      {([
        ['Объект', c.objectName], ['Адрес', c.address],
        ['Заказчик', c.customer], ['Ген. подрядчик', c.generalContractor],
        ['Разрешение', c.permitNumber], ['Начало периода', fmt(c.periodStart)],
        ['Конец периода', fmt(c.periodEnd)],
      ] as [string, string | undefined][]).map(([label, val]) =>
        val ? (
          <Fragment key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{val}</dd>
          </Fragment>
        ) : null
      )}
    </dl>
  );
}

function renderWorkVolumes(c: WorkVolumesContent) {
  if (!c.rows?.length) return <EmptyBlock />;
  return (
    <TableWrapper headers={['Дата', 'Наименование работ', 'Ед.изм.', 'Описание']}>
      {c.rows.map((r, i) => (
        <tr key={i} className="hover:bg-muted/30">
          <td className="border px-2 py-1">{fmt(r.date)}</td>
          <td className="border px-2 py-1">{r.workName}</td>
          <td className="border px-2 py-1">{r.unit || '—'}</td>
          <td className="border px-2 py-1">{r.description || '—'}</td>
        </tr>
      ))}
    </TableWrapper>
  );
}

function renderKs2Acts(c: Ks2ActsContent) {
  if (!c.rows?.length) return <EmptyBlock />;
  return (
    <>
      <TableWrapper headers={['№', 'Период (начало)', 'Период (конец)', 'Сумма, руб.', 'Договор']}>
        {c.rows.map((r, i) => (
          <tr key={i} className="hover:bg-muted/30">
            <td className="border px-2 py-1">{r.number}</td>
            <td className="border px-2 py-1">{fmt(r.periodStart)}</td>
            <td className="border px-2 py-1">{fmt(r.periodEnd)}</td>
            <td className="border px-2 py-1">{r.totalAmount.toLocaleString('ru-RU')}</td>
            <td className="border px-2 py-1">{r.contractNumber}</td>
          </tr>
        ))}
      </TableWrapper>
      {c.totalAmount !== undefined && (
        <p className="text-xs text-right mt-1 font-medium">
          Итого: {c.totalAmount.toLocaleString('ru-RU')} руб.
        </p>
      )}
    </>
  );
}

function renderIdStatus(c: IdStatusContent) {
  if (c.total === undefined) return <EmptyBlock />;
  return (
    <div className="space-y-2 text-sm">
      <p>Всего документов: <strong>{c.total}</strong></p>
      <p>Готовность: <strong>{c.readiness ?? 0}%</strong></p>
      <div className="h-2 rounded bg-muted overflow-hidden">
        <div className="h-full bg-blue-500" style={{ width: `${c.readiness ?? 0}%` }} />
      </div>
      {c.byStatus && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {Object.entries(c.byStatus).map(([s, n]) => <li key={s}>{s}: {n}</li>)}
        </ul>
      )}
    </div>
  );
}

function renderDefectsSummary(c: DefectsSummaryContent) {
  if (c.total === undefined) return <EmptyBlock />;
  return (
    <div className="space-y-2 text-sm">
      <p>Всего недостатков: <strong>{c.total}</strong> {c.overdue ? <span className="text-destructive">(просрочено: {c.overdue})</span> : null}</p>
      {c.byStatus && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">По статусам:</p>
          <ul className="text-xs space-y-0.5">
            {Object.entries(c.byStatus).map(([s, n]) => <li key={s}>{s}: {n}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function renderGprProgress(c: GprProgressContent) {
  if (!c.tasks?.length) return <EmptyBlock />;
  return (
    <>
      <p className="text-xs mb-1">Средний прогресс: <strong>{c.avgProgress ?? 0}%</strong></p>
      <TableWrapper headers={['Задача', 'План начало', 'План конец', 'Факт конец', 'Прогресс', 'Отклонение']}>
        {c.tasks.map((t, i) => (
          <tr key={i} className={t.isCritical ? 'bg-red-50' : 'hover:bg-muted/30'}>
            <td className="border px-2 py-1">{t.name}</td>
            <td className="border px-2 py-1">{fmt(t.planStart)}</td>
            <td className="border px-2 py-1">{fmt(t.planEnd)}</td>
            <td className="border px-2 py-1">{fmt(t.factEnd)}</td>
            <td className="border px-2 py-1">{t.progress}%</td>
            <td className={`border px-2 py-1 ${(t.deviationDays ?? 0) > 0 ? 'text-destructive' : ''}`}>
              {t.deviationDays != null ? `${t.deviationDays > 0 ? '+' : ''}${t.deviationDays} д.` : '—'}
            </td>
          </tr>
        ))}
      </TableWrapper>
    </>
  );
}

function renderPhotoReport(c: PhotoReportContent) {
  if (!c.photos?.length) return <EmptyBlock />;
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Фотографий: {c.total ?? c.photos.length}</p>
      <ul className="text-xs space-y-0.5">
        {c.photos.slice(0, 20).map((p) => (
          <li key={p.id} className="flex gap-2">
            <span className="text-muted-foreground">{fmt(p.takenAt)}</span>
            <span>{p.fileName}</span>
            {p.category && <span className="text-muted-foreground">({p.category})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderFundingStatus(c: FundingStatusContent) {
  if (c.totalFunding === undefined) return <EmptyBlock />;
  return (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded border p-2 text-center">
          <p className="text-xs text-muted-foreground">Финансирование</p>
          <p className="font-semibold">{c.totalFunding?.toLocaleString('ru-RU')} ₽</p>
        </div>
        <div className="rounded border p-2 text-center">
          <p className="text-xs text-muted-foreground">Оплачено</p>
          <p className="font-semibold">{c.totalPaid?.toLocaleString('ru-RU')} ₽</p>
        </div>
        <div className="rounded border p-2 text-center">
          <p className="text-xs text-muted-foreground">Остаток</p>
          <p className="font-semibold">{c.balance?.toLocaleString('ru-RU')} ₽</p>
        </div>
      </div>
    </div>
  );
}

function renderDailyLog(c: DailyLogContent) {
  if (!c.rows?.length) return <EmptyBlock />;
  return (
    <TableWrapper headers={['Дата', 'Погода', 'T°', 'Рабочих', 'Заметки']}>
      {c.rows.map((r, i) => (
        <tr key={i} className="hover:bg-muted/30">
          <td className="border px-2 py-1">{fmt(r.date)}</td>
          <td className="border px-2 py-1">{r.weather || '—'}</td>
          <td className="border px-2 py-1">{r.temperature != null ? `${r.temperature}°` : '—'}</td>
          <td className="border px-2 py-1">{r.workersCount ?? '—'}</td>
          <td className="border px-2 py-1">{r.notes || '—'}</td>
        </tr>
      ))}
    </TableWrapper>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

interface Props {
  type: ReportBlockType;
  content: unknown;
}

export function BlockContentRenderer({ type, content }: Props) {
  if (!content || (typeof content === 'object' && Object.keys(content as object).length === 0)) {
    return <EmptyBlock />;
  }

  switch (type) {
    case 'TITLE_PAGE':      return renderTitlePage(content as TitlePageContent);
    case 'WORK_VOLUMES':    return renderWorkVolumes(content as WorkVolumesContent);
    case 'KS2_ACTS':        return renderKs2Acts(content as Ks2ActsContent);
    case 'ID_STATUS':       return renderIdStatus(content as IdStatusContent);
    case 'DEFECTS_SUMMARY': return renderDefectsSummary(content as DefectsSummaryContent);
    case 'GPR_PROGRESS':    return renderGprProgress(content as GprProgressContent);
    case 'PHOTO_REPORT':    return renderPhotoReport(content as PhotoReportContent);
    case 'FUNDING_STATUS':  return renderFundingStatus(content as FundingStatusContent);
    case 'DAILY_LOG_SUMMARY': return renderDailyLog(content as DailyLogContent);
    case 'FREE_TEXT': {
      const html = (content as FreeTextContent).html ?? '';
      if (!html) return <EmptyBlock />;
      return (
        <div
          className="prose prose-sm max-w-none text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    case 'CUSTOM_TABLE': {
      const { headers = [], rows = [] } = content as { headers?: string[]; rows?: string[][] };
      if (!headers.length) return <EmptyBlock />;
      return (
        <TableWrapper headers={headers}>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-muted/30">
              {row.map((cell, j) => <td key={j} className="border px-2 py-1">{cell}</td>)}
            </tr>
          ))}
        </TableWrapper>
      );
    }
    default:
      return <EmptyBlock />;
  }
}
