'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DocumentCategory } from './useDocumentsRegistry';

interface DocTypeOption {
  value: string;
  label: string;
  category: Exclude<DocumentCategory, 'all'>;
  redirectPath?: string; // относительный путь от /objects/[id]/
  canCreate: boolean;    // создаётся в реестре или только ссылка
}

const DOC_TYPES: DocTypeOption[] = [
  { value: 'aosr',        label: 'АОСР (Акт освидетельствования скрытых работ)', category: 'id',  redirectPath: 'id', canCreate: false },
  { value: 'ozr',         label: 'ОЖР (Общий журнал работ)',                      category: 'id',  redirectPath: 'id', canCreate: false },
  { value: 'ks2',         label: 'КС-2 (Акт выполненных работ)',                  category: 'ks',  redirectPath: 'contracts', canCreate: false },
  { value: 'ks3',         label: 'КС-3 (Справка о стоимости работ)',              category: 'ks',  redirectPath: 'contracts', canCreate: false },
  { value: 'prescription',label: 'Предписание СК',                                category: 'sk',  redirectPath: 'sk/inspections', canCreate: false },
  { value: 'inspection',  label: 'Акт проверки СК',                               category: 'sk',  redirectPath: 'sk/inspections', canCreate: false },
  { value: 'pir_doc',     label: 'Документ ПИР',                                  category: 'pir', redirectPath: 'pir/design-task', canCreate: false },
  { value: 'sed',         label: 'Документ СЭД',                                  category: 'other', redirectPath: 'sed', canCreate: false },
  { value: 'project_doc', label: 'Файл проекта',                                  category: 'other', redirectPath: 'project-management/documents', canCreate: false },
];

function getCategoryTypes(category: DocumentCategory): DocTypeOption[] {
  if (category === 'all') return DOC_TYPES;
  return DOC_TYPES.filter((t) => t.category === category);
}

interface CreateTypedDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
  category: DocumentCategory;
}

export function CreateTypedDocumentDialog({
  open,
  onOpenChange,
  objectId,
  category,
}: CreateTypedDocumentDialogProps) {
  const availableTypes = getCategoryTypes(category);

  // Если категория конкретная и у неё один тип — предзаполнить
  const defaultType =
    availableTypes.length === 1 ? availableTypes[0].value : '';
  const [selectedType, setSelectedType] = useState(defaultType);

  const chosen = DOC_TYPES.find((t) => t.value === selectedType);

  const handleNavigate = () => {
    if (!chosen?.redirectPath) return;
    window.location.href = `/objects/${objectId}/${chosen.redirectPath}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать документ</DialogTitle>
          <DialogDescription>
            Выберите тип документа. Документы создаются в соответствующих модулях системы.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Тип документа</Label>
            <Select
              value={selectedType}
              onValueChange={setSelectedType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип..." />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {chosen && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
              Документы типа <strong className="text-foreground">«{chosen.label}»</strong>{' '}
              создаются в соответствующем модуле. Нажмите кнопку ниже для перехода.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            disabled={!chosen}
            onClick={handleNavigate}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Перейти в модуль
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
