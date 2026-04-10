import { redirect } from 'next/navigation';

export default function IndicatorsPage({
  params,
}: {
  params: { objectId: string };
}) {
  redirect(`/objects/${params.objectId}/info/indicators`);
}
