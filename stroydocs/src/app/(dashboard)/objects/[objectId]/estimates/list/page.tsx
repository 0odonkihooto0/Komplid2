import { redirect } from 'next/navigation';

/** Обратная совместимость — перенаправление на основную вкладку Сметы */
export default function EstimateListPage({
  params,
}: {
  params: { objectId: string };
}) {
  redirect(`/objects/${params.objectId}/estimates`);
}
