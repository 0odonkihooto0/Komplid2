'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { SkChartWidget, type ChartItem } from './SkChartWidget';
import type { ChartType } from './useSkAnalytics';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  data: ChartItem[];
  chartType: ChartType;
  onTypeChange: (t: ChartType) => void;
  colors?: string[];
  showLabels?: boolean;
}

export function SkChartExpandDialog({
  open,
  onClose,
  title,
  data,
  chartType,
  onTypeChange,
  colors,
  showLabels,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <SkChartWidget
          title=""
          data={data}
          chartType={chartType}
          onTypeChange={onTypeChange}
          colors={colors}
          height={420}
          showLabels={showLabels}
        />
      </DialogContent>
    </Dialog>
  );
}
