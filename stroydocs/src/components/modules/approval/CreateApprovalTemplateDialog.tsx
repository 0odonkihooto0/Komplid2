'use client';

import { useState } from 'react';
import { Trash2, PlusCircle, ChevronDown } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useEmployees, useCreateTemplateWithLevels, useApplyTemplate } from './useApprovalTemplates';
import type { PIREntityType } from './types';

interface LevelRow {
  localId: string; // временный ID для ключей React
  userId: string;
  requiresPreviousApproval: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: PIREntityType;
  entityId: string;
  organizationId: string;
  queryKey: unknown[];
  onApplied: () => void;  // После «Применить шаблон»
  onSaved: () => void;    // После «Сохранить шаблон» (без применения)
}

export function CreateApprovalTemplateDialog({
  open, onOpenChange, entityType, entityId, organizationId, queryKey, onApplied, onSaved,
}: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [activeTab, setActiveTab] = useState('info');

  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();

  const createMutation = useCreateTemplateWithLevels(queryKey);
  const applyMutation = useApplyTemplate(queryKey);

  const addLevel = () => {
    setLevels((prev) => [
      ...prev,
      { localId: crypto.randomUUID(), userId: '', requiresPreviousApproval: true },
    ]);
  };

  const removeLevel = (localId: string) => {
    setLevels((prev) => prev.filter((l) => l.localId !== localId));
  };

  const updateLevel = (localId: string, patch: Partial<Omit<LevelRow, 'localId'>>) => {
    setLevels((prev) => prev.map((l) => l.localId === localId ? { ...l, ...patch } : l));
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setLevels([]);
    setActiveTab('info');
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const isValid = name.trim().length > 0 && levels.every((l) => l.userId !== '');

  // Сохранить шаблон без применения
  const handleSave = async () => {
    if (!isValid) return;
    await createMutation.mutateAsync({
      templateParams: { orgId: organizationId, name: name.trim(), description: description.trim() || undefined, entityType },
      levels: levels.map((l) => ({ userId: l.userId, requiresPreviousApproval: l.requiresPreviousApproval })),
    });
    resetForm();
    onSaved();
  };

  // Сохранить шаблон и сразу применить к сущности
  const handleSaveAndApply = async () => {
    if (!isValid) return;
    const templateId = await createMutation.mutateAsync({
      templateParams: { orgId: organizationId, name: name.trim(), description: description.trim() || undefined, entityType },
      levels: levels.map((l) => ({ userId: l.userId, requiresPreviousApproval: l.requiresPreviousApproval })),
    });
    await applyMutation.mutateAsync({
      orgId: organizationId, templateId, entityType, entityId,
    });
    resetForm();
    onApplied();
  };

  const isBusy = createMutation.isPending || applyMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Создать шаблон согласования</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">Информация</TabsTrigger>
            <TabsTrigger value="levels" className="flex-1">
              Уровни согласований {levels.length > 0 && `(${levels.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Название *</Label>
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Маршрут согласования ЗП"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">Описание</Label>
              <Input
                id="tpl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Необязательное описание"
              />
            </div>
          </TabsContent>

          <TabsContent value="levels" className="pt-2">
            <div className="space-y-3">
              {levels.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Уровни не добавлены. Нажмите «Добавить».
                </p>
              )}

              {levels.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">№</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead className="w-32 text-center">Требует предыдущего</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {levels.map((lvl, idx) => (
                      <TableRow key={lvl.localId}>
                        <TableCell className="text-sm text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <Select
                            value={lvl.userId}
                            onValueChange={(v) => updateLevel(lvl.localId, { userId: v })}
                            disabled={isLoadingEmployees}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Выберите..." />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.lastName} {emp.firstName}
                                  {emp.position && ` — ${emp.position}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={lvl.requiresPreviousApproval}
                            onCheckedChange={(checked) =>
                              updateLevel(lvl.localId, { requiresPreviousApproval: checked === true })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeLevel(lvl.localId)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <Button size="sm" variant="outline" onClick={addLevel}>
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Добавить уровень
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isBusy}>
            Отмена
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={!isValid || isBusy}>
                {isBusy ? 'Сохранение...' : 'Действия'}
                <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleSave} disabled={isBusy}>
                Сохранить шаблон
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleSaveAndApply} disabled={isBusy}>
                Применить шаблон
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
