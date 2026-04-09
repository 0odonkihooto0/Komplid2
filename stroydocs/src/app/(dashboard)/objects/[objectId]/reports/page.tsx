import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Модуль 12 — Отчёты: перенаправляем на вкладку «Информационные отчёты»
export default function ObjectReportsPage({
  params,
}: {
  params: { objectId: string };
}) {
  redirect(`/objects/${params.objectId}/reports/list`);
}
