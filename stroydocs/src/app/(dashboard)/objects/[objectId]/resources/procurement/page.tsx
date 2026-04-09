export const dynamic = 'force-dynamic';

import { ProcurementView } from '@/components/objects/resources/ProcurementView';

export default function ResourcesProcurementPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ProcurementView objectId={params.objectId} />;
}
