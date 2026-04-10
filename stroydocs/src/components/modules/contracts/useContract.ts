'use client';

import { useQuery } from '@tanstack/react-query';
import type { ContractType, ContractStatus, ParticipantRole } from '@prisma/client';

export interface ContractParticipantItem {
  id: string;
  role: ParticipantRole;
  appointmentOrder: string | null;
  appointmentDate: string | null;
  organization: {
    id: string;
    name: string;
    inn: string;
    ogrn: string | null;
    address: string | null;
    phone: string | null;
    sroName: string | null;
    sroNumber: string | null;
  };
}

export interface ContractDetail {
  id: string;
  number: string;
  name: string;
  type: ContractType;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  parentId: string | null;
  parent: { id: string; number: string; name: string } | null;
  parentContractId: string | null;
  parentContract: { id: string; number: string; name: string } | null;
  participants: ContractParticipantItem[];
  subContracts: {
    id: string;
    number: string;
    name: string;
    status: ContractStatus;
    _count: { subContracts: number };
  }[];
  childContracts: {
    id: string;
    number: string;
    name: string;
    status: ContractStatus;
    _count: { subContracts: number };
  }[];
}

export function useContract(projectId: string, contractId: string) {
  const { data: contract, isLoading } = useQuery<ContractDetail>({
    queryKey: ['contract', projectId, contractId],
    queryFn: async () => {
      const res = await fetch(`/api/objects/${projectId}/contracts/${contractId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  return { contract, isLoading };
}
