'use client';

import { Check, Minus } from 'lucide-react';
import type { SubscriptionPlan } from '@prisma/client';
import { FEATURE_LABELS } from '@/utils/feature-labels';
import type { AudienceTab } from './AudienceTabsSwitcher';

interface Props {
  plans: SubscriptionPlan[];
  activeTab: AudienceTab;
}

interface FeatureGroup {
  label: string;
  features: string[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: 'Сметы',
    features: [
      'estimates',
      'estimates_import',
      'estimates_compare_basic',
      'estimates_compare_advanced',
      'estimates_export_grand_smeta',
      'estimates_public_link',
      'fgis_cs_prices',
    ],
  },
  {
    label: 'Исполнительная документация',
    features: [
      'execution_docs',
      'aosr_generation',
      'ozr_generation',
      'ks2_ks3_generation',
      'approval_routes',
      'id_registry_auto',
      'xml_minstroy_export',
    ],
  },
  {
    label: 'Журналы и строительный контроль',
    features: ['journals_basic', 'journals_full', 'defects_lite', 'defects_full'],
  },
  {
    label: 'Мобайл и фото',
    features: ['mobile_pwa', 'mobile_offline', 'voice_input', 'photos_gps', 'photos_annotations'],
  },
  {
    label: 'AI и автоматизация',
    features: ['AI_COMPLIANCE_CHECK', 'AI_SMETA_IMPORT', 'OCR_SCAN'],
  },
  {
    label: 'Совместная работа',
    features: ['GUEST_INVITATION', 'TEAM_MULTI_USER', 'PUBLIC_DASHBOARD', 'approval_routes'],
  },
];

function hasFeature(plan: SubscriptionPlan, feature: string): boolean {
  const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
  return features.includes(feature);
}

function Cell({ included }: { included: boolean }) {
  if (included) {
    return <Check className="mx-auto h-4 w-4 text-green-500" aria-label="Включено" />;
  }
  return <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" aria-label="Недоступно" />;
}

export function FeatureMatrix({ plans, activeTab }: Props) {
  if (plans.length === 0) return null;

  const visibleGroups = activeTab === 'B2C'
    ? FEATURE_GROUPS.filter((g) => ['Мобайл и фото', 'AI и автоматизация'].includes(g.label))
    : FEATURE_GROUPS;

  return (
    <section className="overflow-x-auto">
      <h2 className="mb-6 text-center text-xl font-semibold">Сравнение функций</h2>
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b">
            <th className="pb-3 pr-4 text-left font-medium text-muted-foreground w-48">Функция</th>
            {plans.map((plan) => (
              <th key={plan.id} className="pb-3 px-2 text-center font-semibold min-w-[100px]">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleGroups.map((group) => (
            <>
              <tr key={`group-${group.label}`} className="border-b bg-muted/30">
                <td colSpan={plans.length + 1} className="py-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </td>
              </tr>
              {group.features.map((feature) => (
                <tr key={feature} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    {FEATURE_LABELS[feature] ?? feature}
                  </td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="py-2.5 px-2 text-center">
                      <Cell included={hasFeature(plan, feature)} />
                    </td>
                  ))}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </section>
  );
}
