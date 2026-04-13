'use client';

import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useCreateBasedOn,
  useDeleteMovement,
  useCopyMovement,
  type MovementDetail,
  type WarehouseMovementType,
} from './useWarehouseMovement';

interface Props {
  objectId: string;
  movement: MovementDetail;
  onDeleted: () => void;
  onCreatedBased: (id: string) => void;
}

// Пункты «Создать на основании»
const BASED_ON_ITEMS: Array<{
  label: string;
  targetType: WarehouseMovementType | null; // null = В разработке
}> = [
  { label: 'Возврат поставщику',     targetType: 'RETURN' },
  { label: 'Списание',               targetType: 'WRITEOFF' },
  { label: 'Приходный ордер',        targetType: 'RECEIPT_ORDER' },
  { label: 'Расходный ордер',        targetType: 'EXPENSE_ORDER' },
  { label: 'Акт списания в производство', targetType: null },
  { label: 'Переоценка',             targetType: null },
  { label: 'Платёжное поручение',    targetType: null },
  { label: 'Счёт-фактура',           targetType: null },
];

export function MovementActionPanel({ objectId, movement, onDeleted, onCreatedBased }: Props) {
  const createBased = useCreateBasedOn(objectId);
  const deleteMovement = useDeleteMovement(objectId);
  const copyMovement = useCopyMovement(objectId);

  function handleCreateBased(targetType: WarehouseMovementType) {
    createBased.mutate(
      { movementId: movement.id, targetType },
      { onSuccess: (data) => onCreatedBased(data.id) }
    );
  }

  function handleDelete() {
    deleteMovement.mutate(movement.id, { onSuccess: () => onDeleted() });
  }

  function handleCopy() {
    copyMovement.mutate(
      { movementId: movement.id, targetType: movement.movementType },
      { onSuccess: (data) => onCreatedBased(data.id) }
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
        {/* Заполнить из ▾ — заглушка */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Заполнить из <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled className="text-muted-foreground text-xs">
              В разработке
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Создать на основании ▾ */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={createBased.isPending}
            >
              Создать на основании <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {BASED_ON_ITEMS.map((item, idx) => {
              // Разделитель перед блоком «В разработке»
              const isFirstDisabled = item.targetType === null && BASED_ON_ITEMS[idx - 1]?.targetType !== null;
              return (
                <div key={item.label}>
                  {isFirstDisabled && <DropdownMenuSeparator />}
                  {item.targetType !== null ? (
                    <DropdownMenuItem onClick={() => handleCreateBased(item.targetType!)}>
                      {item.label}
                    </DropdownMenuItem>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem disabled className="text-muted-foreground">
                          {item.label}
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>В разработке</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Печать ▾ — заглушка */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Печать <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled className="text-muted-foreground text-xs">
              В разработке
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Действия ▾ */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Действия <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={handleCopy}
              disabled={copyMovement.isPending}
            >
              Копировать
            </DropdownMenuItem>
            {movement.status === 'DRAFT' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleteMovement.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  Удалить
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
