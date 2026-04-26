'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInviteMemberModal } from './useInviteMemberModal';
import type { InviteMemberInput, InviteGuestInput } from '@/lib/validations/workspace-member';

const TEAM_ROLES: { value: InviteMemberInput['role']; label: string }[] = [
  { value: 'ADMIN', label: 'Администратор' },
  { value: 'MANAGER', label: 'Менеджер' },
  { value: 'ENGINEER', label: 'Инженер' },
  { value: 'FOREMAN', label: 'Прораб' },
  { value: 'WORKER', label: 'Рабочий' },
];

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function InviteMemberModal({ open, onOpenChange }: Props) {
  const { teamForm, guestForm, teamMutation, guestMutation, inviteUrl, handleClose } =
    useInviteMemberModal(() => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{inviteUrl ? 'Приглашение создано' : 'Пригласить участника'}</DialogTitle>
          <DialogDescription>
            {inviteUrl ? 'Скопируйте ссылку и отправьте участнику' : 'Выберите тип и заполните данные'}
          </DialogDescription>
        </DialogHeader>

        {inviteUrl ? (
          <>
            <Input value={inviteUrl} readOnly onClick={(e) => (e.target as HTMLInputElement).select()} />
            <DialogFooter><Button onClick={handleClose}>Закрыть</Button></DialogFooter>
          </>
        ) : (
          <Tabs defaultValue="team">
            <TabsList className="w-full">
              <TabsTrigger value="team" className="flex-1">Команда</TabsTrigger>
              <TabsTrigger value="guest" className="flex-1">Гость</TabsTrigger>
            </TabsList>
            <TabsContent value="team">
              <form onSubmit={teamForm.handleSubmit((d) => teamMutation.mutate(d))} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" {...teamForm.register('email')} />
                  {teamForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{teamForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Роль</Label>
                  <Select value={teamForm.watch('role')} onValueChange={(v) => teamForm.setValue('role', v as InviteMemberInput['role'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEAM_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Специализация (необязательно)</Label>
                  <Input {...teamForm.register('specialization')} placeholder="Электрик, Сварщик..." />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>Отмена</Button>
                  <Button type="submit" disabled={teamMutation.isPending}>
                    {teamMutation.isPending ? 'Отправка...' : 'Пригласить'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
            <TabsContent value="guest">
              <form onSubmit={guestForm.handleSubmit((d) => guestMutation.mutate(d))} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" {...guestForm.register('email')} />
                  {guestForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{guestForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Тип гостя</Label>
                  <Select value={guestForm.watch('role')} onValueChange={(v) => guestForm.setValue('role', v as InviteGuestInput['role'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GUEST">Гость</SelectItem>
                      <SelectItem value="CUSTOMER">Заказчик</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Дополнительные права</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox id="canViewCosts"
                      checked={guestForm.watch('guestScope.permissions.canViewCosts') ?? false}
                      onCheckedChange={(v) => guestForm.setValue('guestScope.permissions.canViewCosts', !!v)} />
                    <label htmlFor="canViewCosts" className="text-sm">Видеть стоимости</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="canSignActs"
                      checked={guestForm.watch('guestScope.permissions.canSignActs') ?? false}
                      onCheckedChange={(v) => guestForm.setValue('guestScope.permissions.canSignActs', !!v)} />
                    <label htmlFor="canSignActs" className="text-sm">Подписывать акты</label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>Отмена</Button>
                  <Button type="submit" disabled={guestMutation.isPending}>
                    {guestMutation.isPending ? 'Отправка...' : 'Пригласить'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
