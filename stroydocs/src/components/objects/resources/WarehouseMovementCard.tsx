'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CheckCheck } from 'lucide-react';
import { WarehouseMovDocTab } from './WarehouseMovDocTab';
import { WarehouseMovItemsTab } from './WarehouseMovItemsTab';
import {
  useMovementDetail,
  useConductMovement,
  MOV_TYPE_LABELS,
} from './useWarehouseMovement';
import type { MovementStatus } from './useWarehouseMovement';

interface Props {
  objectId: string;
  movementId: string;
  onClose: () => void;
}

// Варианты бэджей для каждого статуса движения
const STATUS_LABELS: Record<MovementStatus, string> = {
  DRAFT: 'Черновик',
  CONDUCTED: 'Проведено',
  CANCELLED: 'Отменено',
};

const STATUS_VARIANTS: Record<
  MovementStatus,
  'outline' | 'default' | 'destructive' | 'secondary'
> = {
  DRAFT: 'outline',
  CONDUCTED: 'default',
  CANCELLED: 'destructive',
};

export function WarehouseMovementCard({ objectId, movementId, onClose }: Props) {
  const { movement, isLoading } = useMovementDetail(objectId, movementId);
  const conduct = useConductMovement(objectId);
  const [tab, setTab] = useState('doc');

  return (
    <Sheet open={true} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isLoading
              ? 'Загрузка...'
              : movement
                ? `Движение ${movement.number}`
                : 'Движение не найдено'}
          </SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
            Загрузка движения...
          </div>
        )}

        {!isLoading && !movement && (
          <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
            Движение не найдено
          </div>
        )}

        {!isLoading && movement && (
          <div className="space-y-4 mt-4">
            {/* Бэджи статуса и типа + кнопка «Провести» */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANTS[movement.status]}>
                {STATUS_LABELS[movement.status]}
              </Badge>
              <Badge variant="secondary">
                {MOV_TYPE_LABELS[movement.movementType]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {movement.lines.length} поз.
              </span>

              {/* Кнопка доступна только для черновика */}
              {movement.status === 'DRAFT' && (
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => conduct.mutate(movement.id)}
                  disabled={conduct.isPending}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  {conduct.isPending ? 'Проведение...' : 'Провести'}
                </Button>
              )}
            </div>

            {/* Вкладки: документ и товары */}
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="doc">Документ</TabsTrigger>
                <TabsTrigger value="items">
                  Товары
                  {movement.lines.length > 0 && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {movement.lines.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="doc">
                <WarehouseMovDocTab movement={movement} />
              </TabsContent>

              <TabsContent value="items">
                <WarehouseMovItemsTab objectId={objectId} movement={movement} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
