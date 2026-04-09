import { redirect } from 'next/navigation';

export default function GprPage({ params }: { params: { objectId: string } }) {
  redirect(`/objects/${params.objectId}/gpr/structure`);
}
