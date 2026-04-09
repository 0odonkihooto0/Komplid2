import { redirect } from 'next/navigation';

export default function InfoIndexPage({
  params,
}: {
  params: { objectId: string };
}) {
  redirect(`/objects/${params.objectId}/info/participants`);
}
