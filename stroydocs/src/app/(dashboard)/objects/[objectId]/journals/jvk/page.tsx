import { JvkListView } from '@/components/objects/journals/JvkListView';

export const dynamic = 'force-dynamic';

export default function JvkPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <JvkListView objectId={params.objectId} />;
}
