import { redirect } from 'next/navigation';

export default function PhotosPage({
  params,
}: {
  params: { objectId: string };
}) {
  redirect(`/objects/${params.objectId}/info/photos`);
}
