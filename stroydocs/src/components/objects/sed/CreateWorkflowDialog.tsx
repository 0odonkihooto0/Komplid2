'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkflowType } from '@prisma/client';

interface Employee { id: string; firstName: string; lastName: string; position: string | null }
interface Regulation { id: string; name: string; description: string | null; stepsTemplate: unknown }
interface OrgParticipant { organization: { id: string; name: string } }

const WORKFLOW_TYPE_OPTIONS: { value: WorkflowType; label: string }[] = [
  { value: 'APPROVAL',       label: 'Согласование' },
  { value: 'MULTI_APPROVAL', label: 'Многостороннее согласование' },
  { value: 'MULTI_SIGNING',  label: 'Многостороннее подписание' },
  { value: 'DIGITAL_SIGNING',label: 'Подписание ЭП' },
  { value: 'DELEGATION',     label: 'Делегирование' },
  { value: 'REDIRECT',       label: 'Перенаправление' },
  { value: 'REVIEW',         label: 'Рассмотрение' },
];

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
  docId: string;
  orgId: string;
  onCreated: () => void;
}

export function CreateWorkflowDialog({ open, onOpenChange, objectId, docId, orgId, onCreated }: CreateWorkflowDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Tab 1 — по типу
  const [wfType, setWfType] = useState<WorkflowType>('APPROVAL');
  const [participants, setParticipants] = useState<string[]>([]);
  const [observers, setObservers] = useState<string[]>([]);

  // Tab 2 — по регламенту
  const [regulationId, setRegulationId] = useState('');

  // Tab 3 — с параметрами
  const [paramsType, setParamsType] = useState<WorkflowType>('APPROVAL');
  const [incomingNumber, setIncomingNumber] = useState('');
  const [receiverOrgId, setReceiverOrgId] = useState('');
  const [receiverUserId, setReceiverUserId] = useState('');

  const apiBase = `/api/projects/${objectId}/sed/${docId}/workflows`;

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['org-employees'],
    queryFn: async () => { const r = await fetch('/api/organizations/employees'); const j = await r.json(); return j.data; },
    enabled: open,
  });

  const { data: regulations = [] } = useQuery<Regulation[]>({
    queryKey: ['workflow-regulations', orgId],
    queryFn: async () => { const r = await fetch(`/api/organizations/${orgId}/workflow-regulations`); const j = await r.json(); return j.data ?? []; },
    enabled: open,
  });

  const { data: orgParticipants = [] } = useQuery<OrgParticipant[]>({
    queryKey: ['object-participants', objectId],
    queryFn: async () => { const r = await fetch(`/api/projects/${objectId}/participants`); const j = await r.json(); return j.data ?? []; },
    enabled: open,
  });

  const invalidateDoc = () => {
    queryClient.invalidateQueries({ queryKey: ['sed-card', docId] });
    queryClient.invalidateQueries({ queryKey: ['sed', objectId] });
  };

  const byTypeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiBase, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowType: wfType, participants, observers }) });
      const j = await res.json(); if (!j.success) throw new Error(j.error ?? 'Ошибка');
    },
    onSuccess: () => { toast({ title: 'ДО создан' }); invalidateDoc(); onCreated(); handleClose(); },
    onError: (e: Error) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const byRegulationMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase}/by-regulation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ regulationId }) });
      const j = await res.json(); if (!j.success) throw new Error(j.error ?? 'Ошибка');
    },
    onSuccess: () => { toast({ title: 'ДО создан по регламенту' }); invalidateDoc(); onCreated(); handleClose(); },
    onError: (e: Error) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const withParamsMutation = useMutation({
    mutationFn: async () => {
      // Шаг 1: обновляем параметры документа
      const r1 = await fetch(`${apiBase}/with-params`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverOrgId, incomingNumber: incomingNumber || undefined, receiverUserId: receiverUserId || undefined }) });
      const j1 = await r1.json(); if (!j1.success) throw new Error(j1.error ?? 'Ошибка обновления параметров');
      // Шаг 2: создаём ДО по типу
      const ptcp = receiverUserId ? [receiverUserId] : [];
      if (!ptcp.length) throw new Error('Укажите получателя');
      const r2 = await fetch(apiBase, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowType: paramsType, participants: ptcp, observers: [] }) });
      const j2 = await r2.json(); if (!j2.success) throw new Error(j2.error ?? 'Ошибка создания ДО');
    },
    onSuccess: () => { toast({ title: 'ДО создан с параметрами' }); invalidateDoc(); onCreated(); handleClose(); },
    onError: (e: Error) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const handleClose = () => {
    setWfType('APPROVAL'); setParticipants([]); setObservers([]);
    setRegulationId(''); setParamsType('APPROVAL');
    setIncomingNumber(''); setReceiverOrgId(''); setReceiverUserId('');
    onOpenChange(false);
  };

  const toggleArr = (arr: string[], setArr: (v: string[]) => void, id: string) =>
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Создать документооборот (ДО)</DialogTitle>
          <DialogDescription>Выберите способ создания</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="byType">
          <TabsList className="w-full">
            <TabsTrigger value="byType" className="flex-1">По типу</TabsTrigger>
            <TabsTrigger value="byRegulation" className="flex-1">По регламенту</TabsTrigger>
            <TabsTrigger value="withParams" className="flex-1">С параметрами</TabsTrigger>
          </TabsList>

          {/* Вкладка 1 — По типу */}
          <TabsContent value="byType" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Тип ДО</Label>
              <Select value={wfType} onValueChange={(v) => setWfType(v as WorkflowType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WORKFLOW_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Участники (мин. 1)</Label>
              <div className="max-h-36 overflow-y-auto border rounded-md p-2 space-y-1">
                {employees.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={participants.includes(e.id)} onCheckedChange={() => toggleArr(participants, setParticipants, e.id)} />
                    {e.lastName} {e.firstName}{e.position ? ` — ${e.position}` : ''}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Наблюдатели (необязательно)</Label>
              <div className="max-h-28 overflow-y-auto border rounded-md p-2 space-y-1">
                {employees.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={observers.includes(e.id)} onCheckedChange={() => toggleArr(observers, setObservers, e.id)} />
                    {e.lastName} {e.firstName}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Отмена</Button>
              <Button onClick={() => byTypeMutation.mutate()} disabled={participants.length === 0 || byTypeMutation.isPending}>Создать</Button>
            </DialogFooter>
          </TabsContent>

          {/* Вкладка 2 — По регламенту */}
          <TabsContent value="byRegulation" className="space-y-4 pt-2">
            {regulations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Нет регламентов.{' '}
                <a href={`/organizations/${orgId}/settings/regulations`} className="text-blue-600 underline">Создать регламент</a>
              </p>
            ) : (
              <div className="space-y-2">
                <Label>Регламент</Label>
                <Select value={regulationId} onValueChange={setRegulationId}>
                  <SelectTrigger><SelectValue placeholder="Выберите регламент" /></SelectTrigger>
                  <SelectContent>{regulations.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Отмена</Button>
              <Button onClick={() => byRegulationMutation.mutate()} disabled={!regulationId || byRegulationMutation.isPending}>Создать</Button>
            </DialogFooter>
          </TabsContent>

          {/* Вкладка 3 — С параметрами */}
          <TabsContent value="withParams" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Тип ДО</Label>
              <Select value={paramsType} onValueChange={(v) => setParamsType(v as WorkflowType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WORKFLOW_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Входящий номер</Label>
              <Input value={incomingNumber} onChange={(e) => setIncomingNumber(e.target.value)} placeholder="Вх. №..." />
            </div>
            <div className="space-y-2">
              <Label>Организация-получатель</Label>
              <Select value={receiverOrgId} onValueChange={setReceiverOrgId}>
                <SelectTrigger><SelectValue placeholder="Выберите организацию" /></SelectTrigger>
                <SelectContent>{orgParticipants.map((p) => <SelectItem key={p.organization.id} value={p.organization.id}>{p.organization.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Получатель (физлицо)</Label>
              <Select value={receiverUserId} onValueChange={setReceiverUserId}>
                <SelectTrigger><SelectValue placeholder="Выберите сотрудника" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.lastName} {e.firstName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Отмена</Button>
              <Button onClick={() => withParamsMutation.mutate()} disabled={!receiverOrgId || !receiverUserId || withParamsMutation.isPending}>Создать</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
