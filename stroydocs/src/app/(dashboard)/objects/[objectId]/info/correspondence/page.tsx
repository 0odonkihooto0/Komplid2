import { CorrespondenceView } from '@/components/objects/info/CorrespondenceView';

export const dynamic = 'force-dynamic';

export default function CorrespondencePage({
  params,
}: {
  params: { objectId: string };
}) {
  return <CorrespondenceView objectId={params.objectId} />;
}
