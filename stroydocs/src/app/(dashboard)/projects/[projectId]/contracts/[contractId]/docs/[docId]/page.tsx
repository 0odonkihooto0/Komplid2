import { ExecutionDocDetailContent } from '@/components/modules/execution-docs/ExecutionDocDetailContent';

export const dynamic = 'force-dynamic';

interface Props {
  params: { projectId: string; contractId: string; docId: string };
}

export default function ExecutionDocDetailPage({ params }: Props) {
  return (
    <ExecutionDocDetailContent
      projectId={params.projectId}
      contractId={params.contractId}
      docId={params.docId}
    />
  );
}
