import { JournalRegistry } from '@/components/objects/journals/JournalRegistry';

export const dynamic = 'force-dynamic';

export default function JournalsRegistryPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <JournalRegistry objectId={params.objectId} />;
}
