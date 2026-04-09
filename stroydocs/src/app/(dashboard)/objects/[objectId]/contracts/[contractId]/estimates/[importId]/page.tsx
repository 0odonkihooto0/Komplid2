// Алиас: перенаправляем на тот же контент через /projects/ маршрут
// (страница использует useParams() с ключом projectId)
import { redirect } from 'next/navigation';

export default function ObjectEstimatePreviewPage({
  params,
}: {
  params: { objectId: string; contractId: string; importId: string };
}) {
  redirect(
    `/projects/${params.objectId}/contracts/${params.contractId}/estimates/${params.importId}`
  );
}
