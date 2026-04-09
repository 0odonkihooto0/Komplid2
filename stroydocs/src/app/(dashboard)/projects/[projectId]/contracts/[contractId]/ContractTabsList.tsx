import { Hammer, Package, ClipboardList, Camera, FileText, Archive, FlaskConical, Receipt, BookOpen, Table2, CalendarRange, NotebookPen } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface Props {
  participantCount: number;
  subContractCount: number;
}

export function ContractTabsList({ participantCount, subContractCount }: Props) {
  return (
    <TabsList>
      <TabsTrigger value="participants">
        Участники
        <Badge variant="secondary" className="ml-2">{participantCount}</Badge>
      </TabsTrigger>
      <TabsTrigger value="subcontracts">
        Субдоговоры
        <Badge variant="secondary" className="ml-2">{subContractCount}</Badge>
      </TabsTrigger>
      <TabsTrigger value="work-items">
        <Hammer className="mr-1 h-3.5 w-3.5" />
        Виды работ
      </TabsTrigger>
      <TabsTrigger value="materials">
        <Package className="mr-1 h-3.5 w-3.5" />
        Материалы
      </TabsTrigger>
      <TabsTrigger value="input-control">
        <FlaskConical className="mr-1 h-3.5 w-3.5" />
        Входной контроль
      </TabsTrigger>
      <TabsTrigger value="work-records">
        <ClipboardList className="mr-1 h-3.5 w-3.5" />
        Записи о работах
      </TabsTrigger>
      <TabsTrigger value="photos">
        <Camera className="mr-1 h-3.5 w-3.5" />
        Фото
      </TabsTrigger>
      <TabsTrigger value="execution-docs">
        <FileText className="mr-1 h-3.5 w-3.5" />
        ИД
      </TabsTrigger>
      <TabsTrigger value="ks2">
        <Receipt className="mr-1 h-3.5 w-3.5" />
        КС-2/КС-3
      </TabsTrigger>
      <TabsTrigger value="id-registry">
        <BookOpen className="mr-1 h-3.5 w-3.5" />
        Реестр ИД
      </TabsTrigger>
      <TabsTrigger value="aosr-registry">
        <Table2 className="mr-1 h-3.5 w-3.5" />
        Реестр АОСР
      </TabsTrigger>
      <TabsTrigger value="gantt">
        <CalendarRange className="mr-1 h-3.5 w-3.5" />
        График
      </TabsTrigger>
      <TabsTrigger value="archive">
        <Archive className="mr-1 h-3.5 w-3.5" />
        Документарий
      </TabsTrigger>
      <TabsTrigger value="daily-log">
        <NotebookPen className="mr-1 h-3.5 w-3.5" />
        Дневник
      </TabsTrigger>
      <TabsTrigger value="change-orders">
        <Receipt className="mr-1 h-3.5 w-3.5" />
        Доп. работы
      </TabsTrigger>
    </TabsList>
  );
}
