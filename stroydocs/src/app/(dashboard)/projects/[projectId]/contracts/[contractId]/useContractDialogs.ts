'use client';

import { useState, useTransition } from 'react';

/** Состояние всех диалогов и активной вкладки страницы договора */
export function useContractDialogs() {
  const [activeTab, setActiveTab] = useState('participants');
  const [, startTransition] = useTransition();

  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [createWorkItemOpen, setCreateWorkItemOpen] = useState(false);
  const [createMaterialOpen, setCreateMaterialOpen] = useState(false);
  const [createWorkRecordOpen, setCreateWorkRecordOpen] = useState(false);
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [uploadArchiveOpen, setUploadArchiveOpen] = useState(false);
  const [importEstimateOpen, setImportEstimateOpen] = useState(false);
  const [createInputControlOpen, setCreateInputControlOpen] = useState(false);
  const [createKs2Open, setCreateKs2Open] = useState(false);
  const [batchAosrOpen, setBatchAosrOpen] = useState(false);
  const [addObligationOpen, setAddObligationOpen] = useState(false);
  const [linkContractOpen, setLinkContractOpen] = useState(false);
  const [addDetailInfoOpen, setAddDetailInfoOpen] = useState(false);
  const [linkEstimateOpen, setLinkEstimateOpen] = useState(false);
  const [createFinancialTableOpen, setCreateFinancialTableOpen] = useState(false);
  const [addDocLinkZnpOpen, setAddDocLinkZnpOpen] = useState(false);
  const [addDocLinkZniiOpen, setAddDocLinkZniiOpen] = useState(false);

  const switchTab = (tab: string) => startTransition(() => setActiveTab(tab));

  return {
    activeTab,
    setActiveTab: switchTab,
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
    createFinancialTableOpen, setCreateFinancialTableOpen,
    addDocLinkZnpOpen, setAddDocLinkZnpOpen,
    addDocLinkZniiOpen, setAddDocLinkZniiOpen,
  };
}
