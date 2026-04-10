// Клиентские типы для вкладки «Участники» (ЦУС)

export interface OrgParticipant {
  id: string;
  organization: {
    id: string;
    name: string;
    inn: string;
    sroNumber: string | null;
  };
  roles: Array<{ id: string; roleName: string }>;
  createdAt: string;
}

export interface PersonAppointmentInfo {
  id: string;
  documentType: string;
  isActive: boolean;
}

export interface PersonParticipant {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  organization: { id: string; name: string } | null;
  roles: Array<{ id: string; roleName: string }>;
  appointments: PersonAppointmentInfo[];
  createdAt: string;
}

export interface ParticipantsData {
  orgs: OrgParticipant[];
  persons: PersonParticipant[];
}

export interface FilterState {
  search: string;
  role: string; // '' = все роли
}
