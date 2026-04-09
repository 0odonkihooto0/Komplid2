import { ContractAnalyticsView } from '@/components/objects/management/ContractAnalyticsView';

export const dynamic = 'force-dynamic';

export default function ManagementAnalyticsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ContractAnalyticsView projectId={params.objectId} />;
}
