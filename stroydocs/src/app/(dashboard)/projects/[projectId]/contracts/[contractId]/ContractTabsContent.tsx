import Link from 'next/link';
import { UserPlus, Hammer, Package, ClipboardList, FileText, Archive, Upload, FlaskConical, Receipt } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ContractParticipants } from '@/components/modules/contracts/ContractParticipants';
import { AddParticipantDialog } from '@/components/modules/contracts/AddParticipantDialog';
import { WorkItemsTable } from '@/components/modules/work-items/WorkItemsTable';
import { CreateWorkItemDialog } from '@/components/modules/work-items/CreateWorkItemDialog';
import { MaterialsTable } from '@/components/modules/materials/MaterialsTable';
import { CreateMaterialDialog } from '@/components/modules/materials/CreateMaterialDialog';
import { WorkRecordsTable } from '@/components/modules/work-records/WorkRecordsTable';
import { CreateWorkRecordDialog } from '@/components/modules/work-records/CreateWorkRecordDialog';
import { PhotoAttachButton } from '@/components/modules/photos/PhotoAttachButton';
import { PhotoFolderView } from '@/components/modules/photos/PhotoFolderView';
import { ExecutionDocsTable } from '@/components/modules/execution-docs/ExecutionDocsTable';
import { CreateExecutionDocDialog } from '@/components/modules/execution-docs/CreateExecutionDocDialog';
import { ArchiveTable } from '@/components/modules/archive/ArchiveTable';
import { UploadArchiveDialog } from '@/components/modules/archive/UploadArchiveDialog';
import { ImportEstimateDialog } from '@/components/modules/estimates/ImportEstimateDialog';
import { EstimateImportHistory } from '@/components/modules/estimates/EstimateImportHistory';
import { InputControlTable } from '@/components/modules/input-control/InputControlTable';
import { CreateInputControlRecordDialog } from '@/components/modules/input-control/CreateInputControlRecordDialog';
import { Ks2Table } from '@/components/modules/ks2/Ks2Table';
import { CreateKs2Dialog } from '@/components/modules/ks2/CreateKs2Dialog';
import { BatchCreateAosrDialog } from '@/components/modules/execution-docs/BatchCreateAosrDialog';
import { BatchExportButton } from '@/components/modules/execution-docs/BatchExportButton';
import { BatchXmlExportButton } from '@/components/modules/execution-docs/BatchXmlExportButton';
import { IdRegistryPanel } from '@/components/modules/id-registry/IdRegistryPanel';
import { AosrRegistryTable } from '@/components/modules/execution-docs/AosrRegistryTable';
import { GanttContent } from './gantt/GanttContent';
import { DailyLogTab } from '@/components/modules/daily-logs/DailyLogTab';
import { ChangeOrdersTab } from '@/components/modules/change-orders/ChangeOrdersTab';
import { PaymentsTab } from '@/components/modules/contracts/PaymentsTab';
import { AdvancesTab } from '@/components/modules/contracts/AdvancesTab';
import { ExecutionProgressTab } from '@/components/modules/contracts/ExecutionProgressTab';
import { GuaranteesTab } from '@/components/modules/contracts/GuaranteesTab';
import { ObligationsTab } from '@/components/modules/contracts/ObligationsTab';
import { LinkedContractsTab } from '@/components/modules/contracts/LinkedContractsTab';
import { DetailInfoTab } from '@/components/modules/contracts/DetailInfoTab';
import { LocalEstimatesTab } from '@/components/modules/contracts/LocalEstimatesTab';
import { CONTRACT_STATUS_LABELS } from '@/utils/constants';
import type { ContractDetail } from '@/components/modules/contracts/useContract';
import type { useContractDialogs } from './useContractDialogs';

type DialogState = Omit<ReturnType<typeof useContractDialogs>, 'activeTab' | 'setActiveTab'>;

interface Props extends DialogState {
  projectId: string;
  contractId: string;
  activeTab: string;
  contract: ContractDetail;
}

export function ContractTabsContent({
  projectId, contractId, activeTab, contract,
  addParticipantOpen, setAddParticipantOpen,
  createWorkItemOpen, setCreateWorkItemOpen,
  createMaterialOpen, setCreateMaterialOpen,
  createWorkRecordOpen, setCreateWorkRecordOpen,
  createDocOpen, setCreateDocOpen,
  uploadArchiveOpen, setUploadArchiveOpen,
  importEstimateOpen, setImportEstimateOpen,
  createInputControlOpen, setCreateInputControlOpen,
  createKs2Open, setCreateKs2Open,
  batchAosrOpen, setBatchAosrOpen,
  addObligationOpen, setAddObligationOpen,
  linkContractOpen, setLinkContractOpen,
  addDetailInfoOpen, setAddDetailInfoOpen,
  linkEstimateOpen, setLinkEstimateOpen,
}: Props) {
  return (
    <>
      <TabsContent value="participants" className="mt-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setAddParticipantOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Добавить участника
          </Button>
        </div>
        {contract.participants.length === 0 ? (
          <EmptyState title="Нет участников" description="Добавьте участников договора" />
        ) : (
          <ContractParticipants participants={contract.participants} projectId={projectId} contractId={contractId} />
        )}
        <AddParticipantDialog open={addParticipantOpen} onOpenChange={setAddParticipantOpen} projectId={projectId} contractId={contractId} />
      </TabsContent>

      <TabsContent value="subcontracts" className="mt-4">
        {contract.subContracts.length === 0 ? (
          <EmptyState title="Нет субдоговоров" />
        ) : (
          <div className="space-y-2">
            {contract.subContracts.map((sub) => (
              <Link key={sub.id} href={`/objects/${projectId}/contracts/${sub.id}`} className="block rounded-md border p-3 hover:bg-muted transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{sub.number}</p>
                    <p className="text-sm text-muted-foreground">{sub.name}</p>
                  </div>
                  <StatusBadge status={sub.status} label={CONTRACT_STATUS_LABELS[sub.status]} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="work-items" className="mt-4 space-y-4">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setImportEstimateOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />Импорт сметы
          </Button>
          <Button onClick={() => setCreateWorkItemOpen(true)}>
            <Hammer className="mr-2 h-4 w-4" />Добавить вид работ
          </Button>
        </div>
        {activeTab === 'work-items' && <WorkItemsTable projectId={projectId} contractId={contractId} />}
        {activeTab === 'work-items' && <EstimateImportHistory projectId={projectId} contractId={contractId} />}
        <CreateWorkItemDialog open={createWorkItemOpen} onOpenChange={setCreateWorkItemOpen} contractId={contractId} />
        <ImportEstimateDialog open={importEstimateOpen} onOpenChange={setImportEstimateOpen} projectId={projectId} contractId={contractId} />
      </TabsContent>

      <TabsContent value="materials" className="mt-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setCreateMaterialOpen(true)}>
            <Package className="mr-2 h-4 w-4" />Добавить материал
          </Button>
        </div>
        {activeTab === 'materials' && <MaterialsTable projectId={projectId} contractId={contractId} />}
        <CreateMaterialDialog open={createMaterialOpen} onOpenChange={setCreateMaterialOpen} contractId={contractId} />
      </TabsContent>

      <TabsContent value="input-control" className="mt-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setCreateInputControlOpen(true)}>
            <FlaskConical className="mr-2 h-4 w-4" />Создать запись ЖВК
          </Button>
        </div>
        {activeTab === 'input-control' && <InputControlTable contractId={contractId} />}
        <CreateInputControlRecordDialog open={createInputControlOpen} onOpenChange={setCreateInputControlOpen} contractId={contractId} />
      </TabsContent>

      <TabsContent value="work-records" className="mt-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setCreateWorkRecordOpen(true)}>
            <ClipboardList className="mr-2 h-4 w-4" />Создать запись
          </Button>
        </div>
        {activeTab === 'work-records' && <WorkRecordsTable contractId={contractId} projectId={projectId} />}
        <CreateWorkRecordDialog open={createWorkRecordOpen} onOpenChange={setCreateWorkRecordOpen} contractId={contractId} />
      </TabsContent>

      <TabsContent value="photos" className="mt-4 space-y-4">
        <div className="flex justify-end">
          <PhotoAttachButton entityType="CONTRACT" entityId={contractId} />
        </div>
        {activeTab === 'photos' && <PhotoFolderView contractId={contractId} />}
      </TabsContent>

      <TabsContent value="execution-docs" className="mt-4 space-y-4">
        <div className="flex justify-end gap-2">
          <BatchExportButton projectId={projectId} contractId={contractId} />
          <BatchXmlExportButton projectId={projectId} contractId={contractId} />
          <Button variant="outline" onClick={() => setBatchAosrOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />Создать АОСР пакетно
          </Button>
          <Button onClick={() => setCreateDocOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />Создать ИД
          </Button>
        </div>
        {activeTab === 'execution-docs' && <ExecutionDocsTable contractId={contractId} projectId={projectId} />}
        <CreateExecutionDocDialog open={createDocOpen} onOpenChange={setCreateDocOpen} contractId={contractId} />
        <BatchCreateAosrDialog open={batchAosrOpen} onOpenChange={setBatchAosrOpen} projectId={projectId} contractId={contractId} />
      </TabsContent>

      <TabsContent value="ks2" className="mt-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setCreateKs2Open(true)}>
            <Receipt className="mr-2 h-4 w-4" />Создать акт КС-2
          </Button>
        </div>
        {activeTab === 'ks2' && <Ks2Table projectId={projectId} contractId={contractId} />}
        <CreateKs2Dialog open={createKs2Open} onOpenChange={setCreateKs2Open} projectId={projectId} contractId={contractId} />
      </TabsContent>

      <TabsContent value="id-registry" className="mt-4">
        {activeTab === 'id-registry' && <IdRegistryPanel projectId={projectId} contractId={contractId} />}
      </TabsContent>
      <TabsContent value="aosr-registry" className="mt-4">
        {activeTab === 'aosr-registry' && <AosrRegistryTable projectId={projectId} contractId={contractId} />}
      </TabsContent>
      <TabsContent value="gantt" className="mt-4">
        {activeTab === 'gantt' && <GanttContent projectId={projectId} contractId={contractId} />}
      </TabsContent>

      <TabsContent value="archive" className="mt-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setUploadArchiveOpen(true)}>
            <Archive className="mr-2 h-4 w-4" />Загрузить документ
          </Button>
        </div>
        {activeTab === 'archive' && <ArchiveTable contractId={contractId} />}
        <UploadArchiveDialog open={uploadArchiveOpen} onOpenChange={setUploadArchiveOpen} contractId={contractId} projectId={projectId} />
      </TabsContent>

      <TabsContent value="daily-log" className="mt-4">
        {activeTab === 'daily-log' && <DailyLogTab projectId={projectId} contractId={contractId} />}
      </TabsContent>
      <TabsContent value="payments" className="mt-4">
        {activeTab === 'payments' && (
          <PaymentsTab projectId={projectId} contractId={contractId} />
        )}
      </TabsContent>

      <TabsContent value="advances" className="mt-4">
        {activeTab === 'advances' && (
          <AdvancesTab projectId={projectId} contractId={contractId} />
        )}
      </TabsContent>

      <TabsContent value="execution-progress" className="mt-4">
        {activeTab === 'execution-progress' && (
          <ExecutionProgressTab projectId={projectId} contractId={contractId} />
        )}
      </TabsContent>

      <TabsContent value="change-orders" className="mt-4">
        {activeTab === 'change-orders' && <ChangeOrdersTab projectId={projectId} contractId={contractId} />}
      </TabsContent>

      <TabsContent value="guarantees" className="mt-4">
        {activeTab === 'guarantees' && (
          <GuaranteesTab projectId={projectId} contractId={contractId} />
        )}
      </TabsContent>

      <TabsContent value="obligations" className="mt-4">
        <ObligationsTab
          projectId={projectId}
          contractId={contractId}
          addObligationOpen={addObligationOpen}
          setAddObligationOpen={setAddObligationOpen}
        />
      </TabsContent>
      <TabsContent value="linked-contracts" className="mt-4">
        <LinkedContractsTab
          projectId={projectId}
          contractId={contractId}
          childContracts={contract.childContracts}
          parentContract={contract.parentContract}
          linkContractOpen={linkContractOpen}
          setLinkContractOpen={setLinkContractOpen}
        />
      </TabsContent>
      <TabsContent value="detail-info" className="mt-4">
        <DetailInfoTab
          projectId={projectId}
          contractId={contractId}
          addDetailInfoOpen={addDetailInfoOpen}
          setAddDetailInfoOpen={setAddDetailInfoOpen}
        />
      </TabsContent>
      <TabsContent value="local-estimates" className="mt-4">
        <LocalEstimatesTab
          projectId={projectId}
          contractId={contractId}
          linkEstimateOpen={linkEstimateOpen}
          setLinkEstimateOpen={setLinkEstimateOpen}
        />
      </TabsContent>
    </>
  );
}
