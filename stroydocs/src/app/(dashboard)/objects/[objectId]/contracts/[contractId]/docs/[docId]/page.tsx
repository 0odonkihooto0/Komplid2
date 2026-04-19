import { ExecutionDocDetailContent } from '@/components/modules/execution-docs/ExecutionDocDetailContent';

export const dynamic = 'force-dynamic';

interface Props {
  params: { objectId: string; contractId: string; docId: string };
}

export default function ExecutionDocDetailPage({ params }: Props) {
  return (
    <ExecutionDocDetailContent
      projectId={params.objectId}
      contractId={params.contractId}
      docId={params.docId}
    />
  );
}
