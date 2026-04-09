import { CorrespondenceDetail } from '@/components/objects/info/CorrespondenceDetail';

export const dynamic = 'force-dynamic';

export default function CorrespondenceDetailPage({
  params,
}: {
  params: { objectId: string; corrId: string };
}) {
  return <CorrespondenceDetail objectId={params.objectId} corrId={params.corrId} />;
}
