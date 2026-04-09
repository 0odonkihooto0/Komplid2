import { RequestsView } from '@/components/objects/resources/RequestsView';

export const dynamic = 'force-dynamic';

export default function ResourcesRequestsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <RequestsView objectId={params.objectId} />;
}
