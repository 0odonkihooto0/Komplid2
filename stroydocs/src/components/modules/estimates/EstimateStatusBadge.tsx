'use client';

import { Badge } from '@/components/ui/badge';
import {
  ESTIMATE_IMPORT_STATUS_LABELS,
  ESTIMATE_ITEM_STATUS_LABELS,
} from '@/utils/constants';
import type { EstimateImportStatus, EstimateItemStatus } from '@prisma/client';

const IMPORT_STATUS_COLORS: Record<EstimateImportStatus, string> = {
  UPLOADING: 'bg-gray-100 text-gray-800',
  PARSING: 'bg-blue-100 text-blue-800',
  AI_PROCESSING: 'bg-blue-100 text-blue-800',
  PREVIEW: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

const ITEM_STATUS_COLORS: Record<EstimateItemStatus, string> = {
  RECOGNIZED: 'bg-gray-100 text-gray-800',
  MAPPED: 'bg-green-100 text-green-800',
  UNMATCHED: 'bg-yellow-100 text-yellow-800',
  SKIPPED: 'bg-gray-100 text-gray-500 line-through',
  CONFIRMED: 'bg-green-100 text-green-800',
};

interface ImportStatusBadgeProps {
  status: EstimateImportStatus;
}

export function ImportStatusBadge({ status }: ImportStatusBadgeProps) {
  return (
    <Badge variant="outline" className={IMPORT_STATUS_COLORS[status]}>
      {ESTIMATE_IMPORT_STATUS_LABELS[status]}
    </Badge>
  );
}

interface ItemStatusBadgeProps {
  status: EstimateItemStatus;
}

export function ItemStatusBadge({ status }: ItemStatusBadgeProps) {
  return (
    <Badge variant="outline" className={ITEM_STATUS_COLORS[status]}>
      {ESTIMATE_ITEM_STATUS_LABELS[status]}
    </Badge>
  );
}
