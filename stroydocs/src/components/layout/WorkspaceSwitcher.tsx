'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Plus, LogOut, User, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WORKSPACE_ROLE_LABELS } from '@/utils/constants';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import type { WorkspaceRole } from '@prisma/client';

interface WorkspaceMembership {
  id: string;
  role: WorkspaceRole;
  workspace: { id: string; name: string; slug: string; type: string };
}

interface WorkspacesData {
  memberships: WorkspaceMembership[];
  activeWorkspaceId: string | null;
}

const STAFF_ROLES: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'ENGINEER', 'FOREMAN', 'WORKER', 'MEMBER'];

export function WorkspaceSwitcher({ isCollapsed }: { isCollapsed: boolean }) {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<WorkspacesData>({
    queryKey: ['user-workspaces'],
    queryFn: async () => {
      const res = await fetch('/api/user/workspaces');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session?.user,
  });

  const switchMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      const res = await fetch('/api/user/active-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-workspaces'] });
      // Перезагружаем страницу чтобы обновить сессию и данные
      router.refresh();
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  if (!session?.user) return null;

  const user = session.user;
  const initials = `${user.lastName?.[0] ?? ''}${user.firstName?.[0] ?? ''}`.toUpperCase();

  const activeWorkspace = data?.memberships.find(
    (m) => m.workspace.id === data.activeWorkspaceId
  );
  const workspaceName = activeWorkspace?.workspace.name ?? 'Рабочее пространство';
  const activeRole = activeWorkspace?.role;

  const staffMemberships = data?.memberships.filter((m) => STAFF_ROLES.includes(m.role)) ?? [];
  const guestMemberships = data?.memberships.filter((m) => m.role === 'GUEST') ?? [];
  const customerMemberships = data?.memberships.filter((m) => m.role === 'CUSTOMER') ?? [];

  if (isCollapsed) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button className="flex justify-center px-2 py-2 w-full rounded-md hover:bg-white/[0.08] transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-white/10 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-56">
          <WorkspaceMenuItems
            user={user}
            staffMemberships={staffMemberships}
            guestMemberships={guestMemberships}
            customerMemberships={customerMemberships}
            activeWorkspaceId={data?.activeWorkspaceId ?? null}
            onSwitch={(id) => switchMutation.mutate(id)}
            isPending={switchMutation.isPending}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-white/[0.08] transition-colors rounded-md text-left">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-white/10 text-white text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <Skeleton className="h-3 w-24 bg-white/20" />
            ) : (
              <p className="truncate text-sm font-medium text-white leading-tight">
                {workspaceName}
              </p>
            )}
            {activeRole && (
              <p className="text-[10px] text-white/50 leading-tight mt-0.5">
                {WORKSPACE_ROLE_LABELS[activeRole]}
              </p>
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-white/40 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-60">
        <WorkspaceMenuItems
          user={user}
          staffMemberships={staffMemberships}
          guestMemberships={guestMemberships}
          customerMemberships={customerMemberships}
          activeWorkspaceId={data?.activeWorkspaceId ?? null}
          onSwitch={(id) => switchMutation.mutate(id)}
          isPending={switchMutation.isPending}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface MenuItemsProps {
  user: { firstName: string; lastName: string; email: string };
  staffMemberships: WorkspaceMembership[];
  guestMemberships: WorkspaceMembership[];
  customerMemberships: WorkspaceMembership[];
  activeWorkspaceId: string | null;
  onSwitch: (id: string) => void;
  isPending: boolean;
}

function WorkspaceMenuItems({
  user,
  staffMemberships,
  guestMemberships,
  customerMemberships,
  activeWorkspaceId,
  onSwitch,
  isPending,
}: MenuItemsProps) {
  return (
    <>
      <div className="px-2 py-1.5">
        <p className="text-sm font-medium truncate">{user.lastName} {user.firstName}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <DropdownMenuSeparator />

      {staffMemberships.length > 0 && (
        <>
          <DropdownMenuLabel className="text-xs text-muted-foreground">Компании</DropdownMenuLabel>
          {staffMemberships.map((m) => (
            <WorkspaceItem
              key={m.id}
              membership={m}
              isActive={m.workspace.id === activeWorkspaceId}
              onSwitch={onSwitch}
              isPending={isPending}
            />
          ))}
        </>
      )}

      {guestMemberships.length > 0 && (
        <>
          <DropdownMenuLabel className="text-xs text-muted-foreground">Гость</DropdownMenuLabel>
          {guestMemberships.map((m) => (
            <WorkspaceItem
              key={m.id}
              membership={m}
              isActive={m.workspace.id === activeWorkspaceId}
              onSwitch={onSwitch}
              isPending={isPending}
            />
          ))}
        </>
      )}

      {customerMemberships.length > 0 && (
        <>
          <DropdownMenuLabel className="text-xs text-muted-foreground">Мои объекты</DropdownMenuLabel>
          {customerMemberships.map((m) => (
            <WorkspaceItem
              key={m.id}
              membership={m}
              isActive={m.workspace.id === activeWorkspaceId}
              onSwitch={onSwitch}
              isPending={isPending}
            />
          ))}
        </>
      )}

      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => (window.location.href = '/workspace/new')}>
        <Plus className="mr-2 h-4 w-4" />
        Создать рабочее пространство
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => (window.location.href = '/profile')}>
        <User className="mr-2 h-4 w-4" />
        Настройки профиля
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-destructive focus:text-destructive"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Выйти
      </DropdownMenuItem>
    </>
  );
}

function WorkspaceItem({
  membership,
  isActive,
  onSwitch,
  isPending,
}: {
  membership: WorkspaceMembership;
  isActive: boolean;
  onSwitch: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <DropdownMenuItem
      key={membership.id}
      onClick={() => !isActive && onSwitch(membership.workspace.id)}
      disabled={isPending}
      className={cn('cursor-pointer', isActive && 'font-medium')}
    >
      <Building2 className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1 truncate">{membership.workspace.name}</span>
      <div className="flex items-center gap-1.5 ml-2">
        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
          {WORKSPACE_ROLE_LABELS[membership.role]}
        </Badge>
        {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
      </div>
    </DropdownMenuItem>
  );
}
