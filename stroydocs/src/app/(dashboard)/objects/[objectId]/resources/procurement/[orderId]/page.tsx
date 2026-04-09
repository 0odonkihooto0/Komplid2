export const dynamic = 'force-dynamic';

import { SupplierOrderCardView } from '@/components/objects/resources/SupplierOrderCardView';

export default function ResourcesOrderCardPage({
  params,
}: {
  params: { objectId: string; orderId: string };
}) {
  return <SupplierOrderCardView objectId={params.objectId} orderId={params.orderId} />;
}
