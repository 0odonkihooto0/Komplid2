'use client';

import type { ProfessionalRole } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';

const SAME_ROLE_LABELS: Record<ProfessionalRole, string> = {
  SMETCHIK: 'другого сметчика',
  PTO: 'другого ПТО-инженера',
  FOREMAN: 'другого прораба',
  SK_INSPECTOR: 'другого инженера СК',
  SUPPLIER: 'другого снабженца',
  PROJECT_MANAGER: 'другого РП',
  ACCOUNTANT: 'другого бухгалтера',
};

const CROSS_ROLE_EXAMPLES: Record<ProfessionalRole, string> = {
  SMETCHIK: 'прораба или ПТО-инженера',
  PTO: 'прораба или сметчика',
  FOREMAN: 'ПТО-инженера или сметчика',
  SK_INSPECTOR: 'прораба или РП',
  SUPPLIER: 'РП или сметчика',
  PROJECT_MANAGER: 'ПТО-инженера или сметчика',
  ACCOUNTANT: 'сметчика или РП',
};

const ROLE_SELF_LABEL: Record<ProfessionalRole, string> = {
  SMETCHIK: 'сметчик',
  PTO: 'ПТО-инженер',
  FOREMAN: 'прораб',
  SK_INSPECTOR: 'инженер СК',
  SUPPLIER: 'снабженец',
  PROJECT_MANAGER: 'руководитель проекта',
  ACCOUNTANT: 'бухгалтер',
};

interface Props {
  userRole: ProfessionalRole | null;
}

export function CrossRoleExplainer({ userRole }: Props) {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-4 space-y-3">
        <div className="font-semibold text-amber-800 text-sm">
          💡 Приведите коллегу из ДРУГОЙ профессии — получите ×-бонус
        </div>

        {userRole && (
          <div className="text-sm text-amber-700 space-y-1">
            <div>
              Вы {ROLE_SELF_LABEL[userRole]}, приглашаете:
            </div>
            <div className="pl-2 space-y-0.5">
              <div>✓ {SAME_ROLE_LABELS[userRole]} → <strong>50% вам / 30% им</strong></div>
              <div>🚀 {CROSS_ROLE_EXAMPLES[userRole]} → <strong>90% вам / 40% им</strong></div>
            </div>
          </div>
        )}

        {!userRole && (
          <div className="text-sm text-amber-700 space-y-1">
            <div className="pl-2 space-y-0.5">
              <div>✓ Та же профессия → <strong>50% вам / 30% им</strong></div>
              <div>🚀 Другая профессия → <strong>90% вам / 40% им</strong></div>
            </div>
          </div>
        )}

        <div className="text-xs text-amber-600 border-t border-amber-200 pt-2">
          Пример: пригласили ПТО-инженера с Pro за 2 900 ₽ →<br />
          <strong>вам 2 610 ₽</strong> на счёт, <strong>им 1 160 ₽</strong> скидка
        </div>
      </CardContent>
    </Card>
  );
}
