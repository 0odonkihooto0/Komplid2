import { redirect } from 'next/navigation';

export default function TimPage({ params }: { params: { objectId: string } }) {
  redirect(`/objects/${params.objectId}/tim/models`);
}
