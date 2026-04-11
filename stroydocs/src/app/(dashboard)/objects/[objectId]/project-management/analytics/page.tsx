import { ProjectContractAnalyticsView } from '@/components/modules/project-management/ContractAnalyticsView';

export default function ContractAnalyticsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ProjectContractAnalyticsView objectId={params.objectId} />;
}
