'use client';

import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ModelStatusBadgeProps {
  status: 'PROCESSING' | 'READY' | 'ERROR' | 'CONVERTING';
  errorMessage?: string | null;
}

export function ModelStatusBadge({ status, errorMessage }: ModelStatusBadgeProps) {
  if (status === 'PROCESSING') {
    return (
      <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300 bg-yellow-50">
        <Loader2 className="h-3 w-3 animate-spin" />
        Обработка
      </Badge>
    );
  }

  if (status === 'CONVERTING') {
    return (
      <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300 bg-orange-50">
        <Loader2 className="h-3 w-3 animate-spin" />
        Конвертация
      </Badge>
    );
  }

  if (status === 'READY') {
    return (
      <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
        <CheckCircle2 className="h-3 w-3" />
        Готова
      </Badge>
    );
  }

  // ERROR
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 text-red-700 border-red-300 bg-red-50 cursor-help">
            <XCircle className="h-3 w-3" />
            Ошибка
          </Badge>
        </TooltipTrigger>
        {errorMessage && (
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{errorMessage}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
