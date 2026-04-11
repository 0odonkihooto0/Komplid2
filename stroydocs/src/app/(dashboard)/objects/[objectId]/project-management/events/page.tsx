import { EventsView } from '@/components/objects/management/EventsView';

export const dynamic = 'force-dynamic';

export default function ProjectManagementEventsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <EventsView objectId={params.objectId} />;
}
