import { BimIssuesRegistry } from '@/components/modules/tim/BimIssuesRegistry';

interface Props {
  params: { objectId: string };
}

export default function TimIssuesPage({ params }: Props) {
  return <BimIssuesRegistry projectId={params.objectId} />;
}
