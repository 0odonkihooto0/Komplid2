import { ContractDetailContent } from '@/components/modules/contracts/ContractDetailContent';

export default function ContractDetailPage({
  params,
}: {
  params: { projectId: string; contractId: string };
}) {
  return (
    <ContractDetailContent
      projectId={params.projectId}
      contractId={params.contractId}
    />
  );
}
