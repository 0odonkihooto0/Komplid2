import { ContractDetailContent } from '@/components/modules/contracts/ContractDetailContent';

export default function ContractDetailPage({
  params,
}: {
  params: { objectId: string; contractId: string };
}) {
  return (
    <ContractDetailContent
      projectId={params.objectId}
      contractId={params.contractId}
    />
  );
}
