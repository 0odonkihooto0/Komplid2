import { redirect } from 'next/navigation';

export default function ObjectResourcesPage({
  params,
}: {
  params: { objectId: string };
}) {
  redirect(`/objects/${params.objectId}/resources/planning`);
}
