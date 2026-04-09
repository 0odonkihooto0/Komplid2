import { SEDView } from '@/components/objects/sed/SEDView';

export const dynamic = 'force-dynamic';

export default function SEDPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <SEDView objectId={params.objectId} />;
}
