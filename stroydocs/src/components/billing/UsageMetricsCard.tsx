import { db } from '@/lib/db';
import type { SubscriptionPlan } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Props {
  workspaceId: string;
  plan: SubscriptionPlan;
}

interface MetricRowProps {
  label: string;
  current: number;
  max: number | null;
}

/** Строка метрики с прогресс-баром */
function MetricRow({ label, current, max }: MetricRowProps) {
  const isUnlimited = max === null;
  const percent = isUnlimited ? 0 : Math.min(100, Math.round((current / max) * 100));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {current}
          {isUnlimited ? (
            <span className="ml-1 text-xs text-muted-foreground">/ ∞</span>
          ) : (
            <span className="ml-1 text-xs text-muted-foreground">/ {max}</span>
          )}
        </span>
      </div>
      {/* Показываем прогресс только если есть лимит */}
      {!isUnlimited && <Progress value={percent} className="h-2 mt-1" />}
    </div>
  );
}

export async function UsageMetricsCard({ workspaceId, plan }: Props) {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  /**
   * Считаем объекты строительства прямо по workspaceId.
   * EstimateVersion и ExecutionDoc не имеют прямого workspaceId —
   * они связаны через contract → buildingObject → workspace.
   * Используем вложенный where через buildingObject.workspaceId.
   */
  const [objectsCount, estimatesCount, aosrCount] = await Promise.all([
    db.buildingObject.count({ where: { workspaceId } }),

    plan.maxEstimatesPerMonth != null
      ? db.estimateVersion.count({
          where: {
            createdAt: { gte: monthStart },
            contract: {
              buildingObject: { workspaceId },
            },
          },
        })
      : Promise.resolve(0),

    plan.maxAosrPerMonth != null
      ? db.executionDoc.count({
          where: {
            type: 'AOSR',
            createdAt: { gte: monthStart },
            contract: {
              buildingObject: { workspaceId },
            },
          },
        })
      : Promise.resolve(0),
  ]);

  /** Есть ли хотя бы один числовой лимит в плане */
  const hasAnyLimit =
    plan.maxObjects != null ||
    plan.maxEstimatesPerMonth != null ||
    plan.maxAosrPerMonth != null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Использование</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Объекты строительства — показываем всегда */}
        <MetricRow
          label="Объектов строительства"
          current={objectsCount}
          max={plan.maxObjects ?? null}
        />

        {/* Сметы в этом месяце — только если лимит задан */}
        {plan.maxEstimatesPerMonth != null && (
          <MetricRow
            label="Смет загружено в этом месяце"
            current={estimatesCount}
            max={plan.maxEstimatesPerMonth}
          />
        )}

        {/* АОСР в этом месяце — только если лимит задан */}
        {plan.maxAosrPerMonth != null && (
          <MetricRow
            label="АОСР создано в этом месяце"
            current={aosrCount}
            max={plan.maxAosrPerMonth}
          />
        )}

        {/* Если вообще нет лимитов в плане */}
        {!hasAnyLimit && (
          <p className="text-sm text-muted-foreground">Лимитов нет — тариф без ограничений.</p>
        )}
      </CardContent>
    </Card>
  );
}
