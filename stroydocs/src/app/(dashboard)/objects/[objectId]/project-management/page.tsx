import { redirect } from 'next/navigation';

export default function ProjectManagementPage({ params }: { params: { objectId: string } }) {
  redirect(`/objects/${params.objectId}/project-management/contracts`);
}
