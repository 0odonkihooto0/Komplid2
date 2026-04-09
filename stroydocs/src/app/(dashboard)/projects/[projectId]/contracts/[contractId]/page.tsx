import { ContractDetailContent } from './ContractDetailContent';

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
