import { RFIDetail } from '@/components/objects/info/RFIDetail';

export const dynamic = 'force-dynamic';

export default function RFIDetailPage({
  params,
}: {
  params: { objectId: string; rfiId: string };
}) {
  return <RFIDetail objectId={params.objectId} rfiId={params.rfiId} />;
}
