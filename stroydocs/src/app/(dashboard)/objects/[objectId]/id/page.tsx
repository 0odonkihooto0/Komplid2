import { ObjectIdModule } from '@/components/modules/objects/ObjectIdModule';

export const dynamic = 'force-dynamic';

// Исполнительная документация объекта — Модуль 10 ROADMAP
// Вкладки: АОСР | ОЖР | КС-2/КС-3 | Дефекты
export default function ObjectIdPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ObjectIdModule objectId={params.objectId} />;
}
