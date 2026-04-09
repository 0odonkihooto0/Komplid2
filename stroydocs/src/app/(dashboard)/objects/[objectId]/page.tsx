import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// /objects/[objectId] → редирект на паспорт объекта
export default function ObjectRootPage({
  params,
}: {
  params: { objectId: string };
}) {
  redirect(`/objects/${params.objectId}/passport`);
}
