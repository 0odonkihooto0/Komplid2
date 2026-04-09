import { redirect } from 'next/navigation';
import { EstimateTreeView } from '@/components/objects/estimates/EstimateTreeView';

interface Props {
  params: { objectId: string; versionId: string };
  searchParams: Record<string, string | string[] | undefined>;
}

/**
 * Страница детального просмотра версии сметы (Шаг 6 — EstimateTreeView).
 * contractId передаётся через query-параметр при навигации из EstimateListView.
 */
export default function EstimateVersionPage({ params, searchParams }: Props) {
  const { objectId, versionId } = params;
  // searchParams.contractId может быть string | string[] | undefined — берём первое значение
  const rawContractId = searchParams.contractId;
  const contractId = Array.isArray(rawContractId) ? rawContractId[0] : rawContractId;

  // Без contractId вернуться к списку — навигация не завершена корректно
  if (!contractId) {
    redirect(`/objects/${objectId}/estimates/list`);
  }

  return (
    <EstimateTreeView
      objectId={objectId}
      contractId={contractId}
      versionId={versionId}
    />
  );
}
