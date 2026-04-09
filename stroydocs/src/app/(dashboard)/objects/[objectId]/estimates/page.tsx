import { redirect } from 'next/navigation';

export default function ObjectEstimatesPage({
  params,
}: {
  params: { objectId: string };
}) {
  redirect(`/objects/${params.objectId}/estimates/list`);
}
