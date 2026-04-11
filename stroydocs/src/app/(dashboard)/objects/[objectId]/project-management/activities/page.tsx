import { ActivitiesView } from '@/components/objects/management/ActivitiesView';

export default function ActivitiesPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ActivitiesView objectId={params.objectId} />;
}
