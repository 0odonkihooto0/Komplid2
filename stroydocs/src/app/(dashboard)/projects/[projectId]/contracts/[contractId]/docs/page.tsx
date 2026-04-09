import { redirect } from 'next/navigation';

export default function DocsIndexPage({
  params,
}: {
  params: { projectId: string; contractId: string };
}) {
  redirect(`/projects/${params.projectId}/contracts/${params.contractId}`);
}
