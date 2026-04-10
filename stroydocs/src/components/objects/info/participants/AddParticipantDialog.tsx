'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AddParticipantInput } from '@/lib/validations/participants';

interface OrgSearchResult {
  id: string;
  name: string;
  inn: string;
  address: string | null;
}

const personSchema = z.object({
  lastName: z.string().min(1, 'Введите фамилию'),
  firstName: z.string().min(1, 'Введите имя'),
  middleName: z.string().optional(),
  organizationId: z.string().uuid().optional().or(z.literal('')),
});

type PersonFormData = z.infer<typeof personSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'org' | 'person';
  onSubmit: (data: AddParticipantInput) => Promise<void>;
  isPending: boolean;
}

export function AddParticipantDialog({ open, onOpenChange, defaultTab = 'org', onSubmit, isPending }: Props) {
  const [tab, setTab] = useState<'org' | 'person'>(defaultTab);
  const [orgQuery, setOrgQuery] = useState('');
  const [orgResults, setOrgResults] = useState<OrgSearchResult[]>([]);
  const [orgSearchLoading, setOrgSearchLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrgSearchResult | null>(null);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgInn, setNewOrgInn] = useState('');
  const [newOrgAddress, setNewOrgAddress] = useState('');

  const personForm = useForm<PersonFormData>({ resolver: zodResolver(personSchema) });

  const searchOrgs = useCallback(async (q: string) => {
    if (q.length < 2) { setOrgResults([]); return; }
    setOrgSearchLoading(true);
    try {
      const res = await fetch(`/api/organizations/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setOrgResults(json.success ? json.data : []);
    } finally {
      setOrgSearchLoading(false);
    }
  }, []);

  const handleOrgSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrgQuery(val);
    setSelectedOrg(null);
    searchOrgs(val);
  };

  const handleClose = () => {
    onOpenChange(false);
    setOrgQuery(''); setOrgResults([]); setSelectedOrg(null);
    setShowCreateOrg(false); setNewOrgName(''); setNewOrgInn('');
    personForm.reset();
  };

  const handleSubmitOrg = async () => {
    if (selectedOrg) {
      await onSubmit({ type: 'org', organizationId: selectedOrg.id });
    } else if (showCreateOrg && newOrgName && newOrgInn) {
      await onSubmit({ type: 'org', name: newOrgName, inn: newOrgInn, address: newOrgAddress || undefined });
    }
    handleClose();
  };

  const handleSubmitPerson = async (data: PersonFormData) => {
    await onSubmit({
      type: 'person',
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || undefined,
      organizationId: data.organizationId || undefined,
    });
    handleClose();
  };

  const orgCanSubmit = !!selectedOrg || (showCreateOrg && !!newOrgName && newOrgInn.length >= 10);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить участника</DialogTitle>
          <DialogDescription className="sr-only">
            Добавить юридическое или физическое лицо в список участников объекта
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'org' | 'person')}>
          <TabsList className="w-full">
            <TabsTrigger value="org" className="flex-1">Юридическое лицо</TabsTrigger>
            <TabsTrigger value="person" className="flex-1">Физическое лицо</TabsTrigger>
          </TabsList>

          {/* Вкладка Юрлицо */}
          <TabsContent value="org" className="space-y-3 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или ИНН"
                value={orgQuery}
                onChange={handleOrgSearch}
                className="pl-8"
                disabled={!!selectedOrg}
              />
              {orgSearchLoading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin" />}
            </div>
            {orgResults.length > 0 && !selectedOrg && (
              <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
                {orgResults.map((org) => (
                  <button
                    key={org.id}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => { setSelectedOrg(org); setOrgQuery(org.name); setOrgResults([]); }}
                  >
                    <span className="font-medium">{org.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">ИНН: {org.inn}</span>
                  </button>
                ))}
              </div>
            )}
            {orgQuery.length >= 2 && orgResults.length === 0 && !orgSearchLoading && !selectedOrg && (
              <div className="text-center text-sm text-muted-foreground">
                Не найдено.{' '}
                <button
                  className="text-blue-600 hover:underline"
                  onClick={() => setShowCreateOrg(true)}
                >
                  Создать
                </button>
              </div>
            )}
            {showCreateOrg && !selectedOrg && (
              <div className="space-y-2 border rounded-md p-3">
                <p className="text-xs font-medium text-muted-foreground">Новая организация</p>
                <Input placeholder="Наименование" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} />
                <Input placeholder="ИНН (10–12 цифр)" value={newOrgInn} onChange={(e) => setNewOrgInn(e.target.value)} maxLength={12} />
                <Input placeholder="Адрес (необязательно)" value={newOrgAddress} onChange={(e) => setNewOrgAddress(e.target.value)} />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Отмена</Button>
              <Button onClick={handleSubmitOrg} disabled={!orgCanSubmit || isPending}>
                {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Добавление...</> : 'Добавить'}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Вкладка Физлицо */}
          <TabsContent value="person">
            <form onSubmit={personForm.handleSubmit(handleSubmitPerson)} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Фамилия *</Label>
                  <Input {...personForm.register('lastName')} />
                  {personForm.formState.errors.lastName && (
                    <p className="text-xs text-destructive mt-0.5">{personForm.formState.errors.lastName.message}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Имя *</Label>
                  <Input {...personForm.register('firstName')} />
                  {personForm.formState.errors.firstName && (
                    <p className="text-xs text-destructive mt-0.5">{personForm.formState.errors.firstName.message}</p>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs">Отчество</Label>
                <Input {...personForm.register('middleName')} />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={handleClose}>Отмена</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Добавление...</> : 'Добавить'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
