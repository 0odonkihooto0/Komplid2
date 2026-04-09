'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings2, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Widget {
  id: string;
  type: string;
  title: string;
  isVisible: boolean;
}

interface Props {
  widgets: Widget[];
}

export function DashboardWidgetsManager({ widgets }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      await fetch(`/api/dashboard/widgets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
          <Settings2 className="h-3.5 w-3.5" />
          Настроить виджеты
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Виджеты дашборда</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {widgets.map((widget) => (
            <div key={widget.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {widget.isVisible
                  ? <Eye className="h-4 w-4 text-primary" />
                  : <EyeOff className="h-4 w-4 text-muted-foreground" />
                }
                <Label htmlFor={`widget-${widget.id}`} className="text-sm cursor-pointer">
                  {widget.title}
                </Label>
              </div>
              <Switch
                id={`widget-${widget.id}`}
                checked={widget.isVisible}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ id: widget.id, isVisible: checked })
                }
                disabled={toggleMutation.isPending}
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Перетащите виджеты на дашборде для изменения порядка.
        </p>
      </DialogContent>
    </Dialog>
  );
}
