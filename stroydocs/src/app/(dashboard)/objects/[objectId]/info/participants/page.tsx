import { ParticipantsView } from '@/components/objects/info/participants/ParticipantsView';

export const dynamic = 'force-dynamic';

export default function ParticipantsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ParticipantsView projectId={params.objectId} />;
}
