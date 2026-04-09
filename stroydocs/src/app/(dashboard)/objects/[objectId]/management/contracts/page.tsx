import { ManagementContractsView } from '@/components/objects/management/ManagementContractsView';

export const dynamic = 'force-dynamic';

export default function ManagementContractsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ManagementContractsView objectId={params.objectId} />;
}
