import { redirect } from 'next/navigation';

export default function TasksPage({
  params,
}: {
  params: { objectId: string };
}) {
  redirect(`/objects/${params.objectId}/info/tasks`);
}
