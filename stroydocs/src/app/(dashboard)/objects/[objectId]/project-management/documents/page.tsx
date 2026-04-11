import { ProjectDocumentsRegistryView } from '@/components/objects/management/ProjectDocumentsRegistryView';

export const dynamic = 'force-dynamic';

interface Props {
  params: { objectId: string };
}

export default function ProjectManagementDocumentsPage({ params }: Props) {
  return <ProjectDocumentsRegistryView objectId={params.objectId} />;
}
