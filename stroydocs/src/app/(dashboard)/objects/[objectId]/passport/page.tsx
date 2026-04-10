import { redirect } from 'next/navigation';

export default function PassportPage({
  params,
}: {
  params: { objectId: string };
}) {
  redirect(`/objects/${params.objectId}/info/general`);
}
