'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type AudienceTab = 'B2B' | 'PROFI' | 'B2C';

interface Props {
  value: AudienceTab;
  onChange: (tab: AudienceTab) => void;
}

const TABS: { value: AudienceTab; label: string }[] = [
  { value: 'B2B', label: 'Для подрядчиков (B2B)' },
  { value: 'PROFI', label: 'Для специалистов (Профи)' },
  { value: 'B2C', label: 'Для заказчиков' },
];

export function AudienceTabsSwitcher({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as AudienceTab)}>
      <TabsList className="h-auto flex-wrap gap-1">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
