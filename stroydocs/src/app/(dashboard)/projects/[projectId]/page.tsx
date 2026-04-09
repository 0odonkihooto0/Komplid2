import { redirect } from 'next/navigation';

// Обратная совместимость: старые URL /projects/[id] перенаправляются на /objects/[id]/passport
export default function ProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  redirect(`/objects/${params.projectId}/passport`);
}
