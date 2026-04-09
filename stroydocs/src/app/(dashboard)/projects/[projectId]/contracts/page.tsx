import { redirect } from 'next/navigation';

export default function ContractsRedirectPage({
  params,
}: {
  params: { projectId: string };
}) {
  redirect(`/projects/${params.projectId}`);
}
