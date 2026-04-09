import { redirect } from 'next/navigation';

// Перенаправление на реестр журналов
export default function JournalsPage({
  params,
}: {
  params: { objectId: string };
}) {
  redirect(`/objects/${params.objectId}/journals/registry`);
}
