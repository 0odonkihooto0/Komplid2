import { PublicitySettings } from '@/components/objects/management/PublicitySettings';
import { PublicityAnalytics } from '@/components/objects/management/PublicityAnalytics';

// Страница управления публичностью объекта строительства
// Доступна через /objects/[objectId]/project-management/publicity
export default function PublicityPage({ params }: { params: { objectId: string } }) {
  return (
    <div className="space-y-6 py-4">
      <div>
        <h2 className="text-lg font-semibold">Публичный дашборд</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Поделитесь прогрессом строительства с заказчиком по уникальной ссылке
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PublicitySettings objectId={params.objectId} />
        <PublicityAnalytics objectId={params.objectId} />
      </div>
    </div>
  );
}
