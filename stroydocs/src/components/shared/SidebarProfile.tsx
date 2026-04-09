'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatRole } from '@/utils/format';
import type { UserRole } from '@prisma/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProfileProps {
  firstName: string;
  lastName: string;
  role: UserRole;
  isCollapsed: boolean;
}

export function SidebarProfile({ firstName, lastName, role, isCollapsed }: SidebarProfileProps) {
  const initials = `${lastName[0]}${firstName[0]}`.toUpperCase();

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={100}>
        <div className="flex flex-col items-center gap-1 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/profile" className="flex justify-center px-2 py-2 rounded-md hover:bg-white/[0.08] transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-white/10 text-white text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{lastName} {firstName}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/organizations" className="flex justify-center p-1 text-white/50 hover:text-white transition-colors">
                <Building2 className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Организация</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="px-3 py-3">
      <Link href="/profile" className="flex items-center gap-3 hover:bg-white/[0.08] transition-colors rounded-md px-1 py-1">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-white/10 text-white text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-white">{lastName} {firstName}</p>
          <Badge className="bg-white/10 text-white/80 border-0 text-[10px] px-1.5 py-0 mt-0.5">
            {formatRole(role)}
          </Badge>
        </div>
      </Link>
      <Link
        href="/organizations"
        className="flex items-center gap-1.5 mt-1 px-1 text-xs text-white/50 hover:text-white transition-colors"
      >
        <Building2 className="h-3 w-3" />
        Организация
      </Link>
    </div>
  );
}
