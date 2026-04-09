import { PIRClosureActList } from '@/components/objects/pir/PIRClosureActList';

export const dynamic = 'force-dynamic';

export default function PIRClosurePage({
  params,
}: {
  params: { objectId: string };
}) {
  return <PIRClosureActList objectId={params.objectId} />;
}
