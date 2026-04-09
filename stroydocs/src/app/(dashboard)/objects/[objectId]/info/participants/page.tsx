import { ParticipantsView } from '@/components/objects/info/ParticipantsView';

export const dynamic = 'force-dynamic';

export default function ParticipantsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ParticipantsView objectId={params.objectId} />;
}
