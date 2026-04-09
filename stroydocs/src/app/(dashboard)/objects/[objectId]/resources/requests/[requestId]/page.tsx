import { RequestCardView } from '@/components/objects/resources/RequestCardView';

export const dynamic = 'force-dynamic';

export default function ResourcesRequestCardPage({
  params,
}: {
  params: { objectId: string; requestId: string };
}) {
  return <RequestCardView objectId={params.objectId} requestId={params.requestId} />;
}
