'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  Calendar,
  Calculator,
  Package,
  BookOpen,
  FileCheck,
  Shield,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const moduleItems = [
  { segment: 'passport',   label: 'Паспорт',        icon: ClipboardList },
  { segment: 'gpr',        label: 'ГПР',             icon: Calendar },
  { segment: 'estimates',  label: 'Сметы',           icon: Calculator },
  { segment: 'resources',  label: 'Ресурсы',         icon: Package },
  { segment: 'journals',   label: 'Журналы',         icon: BookOpen },
  { segment: 'id',         label: 'ИД',              icon: FileCheck },
  { segment: 'sk',         label: 'Стройконтроль',   icon: Shield },
  { segment: 'reports',    label: 'Отчёты',          icon: BarChart3 },
];

interface Props {
  objectId: string;
  isCollapsed: boolean;
}

export function SidebarObjectModules({ objectId, isCollapsed }: Props) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={100}>
      {!isCollapsed && (
        <p className="mb-1 px-3 text-xs font-medium text-white/50 uppercase">
          Модули объекта
        </p>
      )}
      <nav className="space-y-0.5">
        {moduleItems.map((item) => {
          const href = `/objects/${objectId}/${item.segment}`;
          const isActive = pathname.startsWith(href);

          const linkContent = (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center rounded-md text-sm font-medium transition-colors',
                isCollapsed ? 'justify-center px-2 py-1.5' : 'gap-2 px-3 py-1.5',
                isActive
                  ? 'bg-blue-600/30 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
              )}
            >
              <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="truncate text-xs">{item.label}</span>
              )}
            </Link>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>
    </TooltipProvider>
  );
}
