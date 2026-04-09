import { WarehouseView } from '@/components/objects/resources/WarehouseView';

export const dynamic = 'force-dynamic';

interface Props {
  params: { objectId: string };
}

export default function WarehousePage({ params }: Props) {
  return <WarehouseView objectId={params.objectId} />;
}
