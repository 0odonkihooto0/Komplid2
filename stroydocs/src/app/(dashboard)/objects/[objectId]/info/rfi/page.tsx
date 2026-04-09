import { RFIView } from '@/components/objects/info/RFIView';

export const dynamic = 'force-dynamic';

export default function RFIPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <RFIView objectId={params.objectId} />;
}
