import { ProjectIndicatorsView } from '@/components/objects/indicators/ProjectIndicatorsView';

export const dynamic = 'force-dynamic';

export default function InfoIndicatorsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ProjectIndicatorsView projectId={params.objectId} />;
}
