import { OzrListView } from '@/components/objects/journals/OzrListView';

export const dynamic = 'force-dynamic';

export default function OzrPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <OzrListView objectId={params.objectId} />;
}
