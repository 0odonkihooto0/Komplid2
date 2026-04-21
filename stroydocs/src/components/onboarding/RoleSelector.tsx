'use client';

import {
  Calculator,
  FileText,
  HardHat,
  ShieldCheck,
  Package,
  Briefcase,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProfessionalRole } from '@prisma/client';

interface RoleOption {
  value: ProfessionalRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLES: RoleOption[] = [
  {
    value: 'SMETCHIK',
    label: 'Сметчик / ПЭО',
    description: 'Составляю сметы, веду учёт стоимости работ',
    icon: Calculator,
  },
  {
    value: 'PTO',
    label: 'ПТО-инженер',
    description: 'Веду исполнительную документацию и журналы',
    icon: FileText,
  },
  {
    value: 'FOREMAN',
    label: 'Прораб / мастер СМР',
    description: 'Организую производство работ на объекте',
    icon: HardHat,
  },
  {
    value: 'SK_INSPECTOR',
    label: 'Инженер СК / технадзор',
    description: 'Контролирую качество и веду дефектовку',
    icon: ShieldCheck,
  },
  {
    value: 'SUPPLIER',
    label: 'Снабженец / закупщик',
    description: 'Управляю материалами и поставщиками',
    icon: Package,
  },
  {
    value: 'PROJECT_MANAGER',
    label: 'Руководитель проекта / ГИП',
    description: 'Курирую все направления проекта',
    icon: Briefcase,
  },
  {
    value: 'ACCOUNTANT',
    label: 'Бухгалтер строительства',
    description: 'Веду учёт затрат и финансовую отчётность',
    icon: BookOpen,
  },
];

interface Props {
  selected: ProfessionalRole | null;
  onSelect: (role: ProfessionalRole) => void;
}

export function RoleSelector({ selected, onSelect }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ROLES.map(({ value, label, description, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted',
            selected === value
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border'
          )}
        >
          <div className={cn(
            'mt-0.5 rounded-md p-2',
            selected === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
