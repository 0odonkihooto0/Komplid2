'use client';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { SEDDocumentFull } from './useSEDDocumentCard';

interface SEDParamsTabProps {
  doc: SEDDocumentFull;
}

export function SEDParamsTab({ doc }: SEDParamsTabProps) {
  return (
    <div className="space-y-6">
      {/* Тэги */}
      <div>
        <h3 className="text-sm font-medium mb-2">Тэги</h3>
        {doc.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {doc.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-sm">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Тэги не указаны</p>
        )}
      </div>

      <Separator />

      {/* Наблюдатели */}
      <div>
        <h3 className="text-sm font-medium mb-2">Наблюдатели</h3>
        {doc.observers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {doc.observers.map((observerId, idx) => (
              <Badge key={observerId} variant="outline" className="font-mono text-xs">
                Наблюдатель {idx + 1}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Наблюдатели не назначены</p>
        )}
      </div>
    </div>
  );
}
