import { ExecutionDocDetailContent } from '@/components/modules/execution-docs/ExecutionDocDetailContent';

export default function ObjectDocDetailPage({
  params,
}: {
  params: { objectId: string; contractId: string; docId: string };
}) {
  return (
    <ExecutionDocDetailContent
      projectId={params.objectId}
      contractId={params.contractId}
      docId={params.docId}
    />
  );
}
