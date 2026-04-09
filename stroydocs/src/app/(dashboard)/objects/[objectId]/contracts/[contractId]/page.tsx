import { ContractDetailContent } from '@/app/(dashboard)/projects/[projectId]/contracts/[contractId]/ContractDetailContent';

export default function ObjectContractDetailPage({
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
