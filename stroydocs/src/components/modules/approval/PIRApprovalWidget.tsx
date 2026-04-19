'use client';

import { useSession } from 'next-auth/react';
import { ApprovalTemplateSelector } from './ApprovalTemplateSelector';
import { ApprovalTimeline } from './ApprovalTimeline';
import type { ApprovalRoute, PIREntityType } from './types';

interface Props {
  entityType: PIREntityType;
  entityId: string;
  objectId: string;
  approvalRoute: ApprovalRoute | null;
  entityStatus: string;
  isTerminalStatus: boolean;  // APPROVED | CANCELLED | SIGNED
  canStartApproval: boolean;  // правило из state-machine родителя
  queryKey: unknown[];
}

/** Вычислить базовый URL маршрута согласования по типу сущности ПИР */
function getWorkflowBaseUrl(entityType: PIREntityType, objectId: string, entityId: string): string {
  switch (entityType) {
    case 'DESIGN_TASK_PIR':
    case 'DESIGN_TASK_SURVEY':
      return `/api/projects/${objectId}/design-tasks/${entityId}/workflow`;
    case 'DESIGN_DOC':
      return `/api/projects/${objectId}/design-docs/${entityId}/workflow`;
    case 'PIR_CLOSURE':
      return `/api/projects/${objectId}/pir-closure/${entityId}/workflow`;
  }
}

/**
 * Единый виджет согласования для DesignTask, DesignDocument и PIRClosureAct.
 * Заменяет PIRApprovalSection, PIRDocApprovalSection, PIRClosureApprovalSection.
 */
export function PIRApprovalWidget({
  entityType,
  entityId,
  objectId,
  approvalRoute,
  isTerminalStatus,
  queryKey,
}: Props) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';

  const workflowBaseUrl = getWorkflowBaseUrl(entityType, objectId, entityId);

  // Показываем выбор шаблона только если маршрута нет (и статус не финальный)
  // При REJECTED canStartApproval=true, но маршрут существует — показываем таймлайн
  // После «Остановить» маршрут становится null → автоматически появляется selector
  const showSelector = !approvalRoute && !isTerminalStatus;

  return (
    <div className="space-y-4 rounded-md border p-4">
      <h3 className="text-sm font-medium">Маршрут согласования</h3>

      {/* Нет активного маршрута — предлагаем выбрать шаблон */}
      {showSelector && (
        <ApprovalTemplateSelector
          entityType={entityType}
          entityId={entityId}
          objectId={objectId}
          isTerminalStatus={isTerminalStatus}
          queryKey={queryKey}
        />
      )}

      {/* Есть активный маршрут — показываем таймлайн (включая REJECTED) */}
      {approvalRoute && (
        <ApprovalTimeline
          route={approvalRoute}
          workflowBaseUrl={workflowBaseUrl}
          queryKey={queryKey}
          currentUserId={currentUserId}
          canStop={!isTerminalStatus}
        />
      )}
    </div>
  );
}
