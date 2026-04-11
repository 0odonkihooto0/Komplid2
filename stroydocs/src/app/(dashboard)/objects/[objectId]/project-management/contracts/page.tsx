import { ContractsList } from '@/components/objects/contracts/ContractsList';
import { ObjectHeader } from '@/components/objects/ObjectHeader';

export const dynamic = 'force-dynamic';

export default function ProjectManagementContractsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return (
    <div className="space-y-6">
      <ObjectHeader projectId={params.objectId} />
      <ContractsList objectId={params.objectId} />
    </div>
  );
}
