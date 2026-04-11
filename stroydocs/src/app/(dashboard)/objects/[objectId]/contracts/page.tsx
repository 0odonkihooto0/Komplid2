import { redirect } from 'next/navigation';

export default function ContractsPage({ params }: { params: { objectId: string } }) {
  redirect(`/objects/${params.objectId}/project-management/contracts`);
}
