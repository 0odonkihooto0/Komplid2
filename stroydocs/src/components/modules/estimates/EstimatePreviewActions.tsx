'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Props {
  selectedCount: number;
  isConfirming: boolean;
  isDeleting: boolean;
  isReadOnly: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EstimatePreviewActions({
  selectedCount,
  isConfirming,
  isDeleting,
  isReadOnly,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="sticky bottom-0 flex items-center justify-between border-t bg-background p-4">
      <div className="text-sm text-muted-foreground">
        {selectedCount > 0
          ? `Выбрано видов работ: ${selectedCount}`
          : 'Выберите хотя бы один вид работ для импорта'}
      </div>

      {!isReadOnly && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isConfirming || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Удаление...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Отмена
              </>
            )}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={selectedCount === 0 || isConfirming}
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Импорт...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Импорт работ ({selectedCount})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
