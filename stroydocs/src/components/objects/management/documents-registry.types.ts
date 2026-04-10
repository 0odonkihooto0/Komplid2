// Общие типы для сводного реестра документов объекта

export type DocumentCategory = 'all' | 'id' | 'ks' | 'sk' | 'pir' | 'other';

export type RegistryEntityType =
  | 'ExecutionDoc'
  | 'Ks2Act'
  | 'Ks3Certificate'
  | 'InspectionAct'
  | 'Prescription'
  | 'DefectRemediationAct'
  | 'DesignDocument'
  | 'SEDDocument'
  | 'ProjectDocument';

export type RegistryDocument = {
  id: string;
  entityType: RegistryEntityType;
  category: Exclude<DocumentCategory, 'all'>;
  type: string;
  number: string | null;
  date: string | null;
  name: string;
  status: string | null;
  version: number | null;
  hasFile: boolean;
  activeComments: number;
};
