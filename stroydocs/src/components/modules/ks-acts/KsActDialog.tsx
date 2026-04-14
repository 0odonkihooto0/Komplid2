'use client';

import { FileText, Printer, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Ks11Form } from './Ks11Form';
import { Ks14Form } from './Ks14Form';
import { useKsActDetail, usePrintKsAct } from './useKsActForm';
import type { KsActFormFields } from './useKsActForm';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  IN_REVIEW: 'На согласовании',
  SIGNED: 'Подписан',
  REJECTED: 'Отклонён',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  IN_REVIEW: 'default',
  SIGNED: 'default',
  REJECTED: 'destructive',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actId: string;
  objectId: string;
  contractId: string;
}

export function KsActDialog({ open, onOpenChange, actId, objectId, contractId }: Props) {
  const { data: doc, isLoading } = useKsActDetail(objectId, contractId, actId);
  const printMutation = usePrintKsAct(objectId, contractId);

  const handlePrint = () => {
    printMutation.mutate(actId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <DialogTitle>
              {doc ? `${doc.number} — ${doc.title}` : 'Загрузка...'}
            </DialogTitle>
            {doc?.status && (
              <Badge variant={STATUS_VARIANTS[doc.status] ?? 'secondary'}>
                {STATUS_LABELS[doc.status] ?? doc.status}
              </Badge>
            )}
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!doc || printMutation.isPending}
              >
                {printMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Printer className="h-4 w-4 mr-1" />}
                Печать
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : doc ? (
          <Tabs defaultValue="form" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="shrink-0">
              <TabsTrigger value="form">Форма</TabsTrigger>
              <TabsTrigger value="files">Файлы</TabsTrigger>
              <TabsTrigger value="approval" disabled>Согласование</TabsTrigger>
              <TabsTrigger value="signing" disabled>Подписание</TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-[65vh] pr-4">
                {doc.type === 'KS_11' ? (
                  <Ks11Form
                    actId={actId}
                    objectId={objectId}
                    contractId={contractId}
                    formData={doc.ksActFormData as KsActFormFields | null}
                  />
                ) : (
                  <Ks14Form
                    actId={actId}
                    objectId={objectId}
                    contractId={contractId}
                    formData={doc.ksActFormData as KsActFormFields | null}
                  />
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Загрузка файлов доступна через общий интерфейс документа.
              </p>
            </TabsContent>

            <TabsContent value="approval" className="mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Согласование доступно после проведения документа.
              </p>
            </TabsContent>

            <TabsContent value="signing" className="mt-4">
              <div className="py-8 text-center space-y-2">
                <Badge variant="secondary">ЭЦП в разработке</Badge>
                <p className="text-sm text-muted-foreground">
                  Подписание через КриптоПро CSP будет доступно в следующей версии.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
