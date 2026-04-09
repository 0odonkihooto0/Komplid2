import { TasksView } from '@/components/objects/tasks/TasksView';

export const dynamic = 'force-dynamic';

export default function InfoTasksPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <TasksView projectId={params.objectId} />;
}
