'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateExecutionDocDialog } from './CreateExecutionDocDialog';
import { GeneralDocDialog } from './GeneralDocDialog';
import { CreateKs2Dialog } from '@/components/modules/ks2/CreateKs2Dialog';
import type { ExecutionDocType } from '@prisma/client';

interface Props {
  contractId: string;
  projectId: string;
  onCreated?: () => void;
}

// Вложенный дропдаун «Создать документ» по группам ЦУС
export function CreateDocDropdown({ contractId, projectId, onCreated }: Props) {
  const [execDocOpen, setExecDocOpen] = useState(false);
  const [execDocType, setExecDocType] = useState<ExecutionDocType>('AOSR');

  const [ks2Open, setKs2Open] = useState(false);

  const [generalOpen, setGeneralOpen] = useState(false);
  const [generalDocType, setGeneralDocType] = useState<ExecutionDocType>('GENERAL_DOCUMENT');

  const openExecDoc = (type: ExecutionDocType) => {
    setExecDocType(type);
    setExecDocOpen(true);
  };

  const openGeneralDoc = (type: ExecutionDocType) => {
    setGeneralDocType(type);
    setGeneralOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Создать документ
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">

          {/* Группа: Общестроительные работы */}
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Общестроительные работы
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => openExecDoc('AOSR')}>
            Акт освидетельствования скрытых работ
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openExecDoc('TECHNICAL_READINESS_ACT')}>
            Акт технической готовности
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Группа: Акты КС */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Акты КС</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              <DropdownMenuItem onSelect={() => setKs2Open(true)}>КС-2</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setKs2Open(true)}>
                КС-3 <span className="ml-1 text-xs text-muted-foreground">(из КС-2)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => openGeneralDoc('KS_6A')}>КС-6а</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openGeneralDoc('KS_11')}>КС-11</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openGeneralDoc('KS_14')}>КС-14</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Группа: Другие */}
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Другие
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => openGeneralDoc('GENERAL_DOCUMENT')}>
            Общий документ
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>

      {/* Диалог создания АОСР / АТГ */}
      <CreateExecutionDocDialog
        open={execDocOpen}
        onOpenChange={(v) => {
          setExecDocOpen(v);
          if (!v) onCreated?.();
        }}
        contractId={contractId}
      />

      {/* Диалог создания КС-2 */}
      <CreateKs2Dialog
        open={ks2Open}
        onOpenChange={(v) => {
          setKs2Open(v);
          if (!v) onCreated?.();
        }}
        projectId={projectId}
        contractId={contractId}
      />

      {/* Диалог создания общего документа (GENERAL_DOCUMENT, KS_6A, KS_11, KS_14) */}
      <GeneralDocDialog
        open={generalOpen}
        onOpenChange={(v) => {
          setGeneralOpen(v);
          if (!v) onCreated?.();
        }}
        objectId={projectId}
        contractId={contractId}
        docType={generalDocType}
      />
    </>
  );
}
