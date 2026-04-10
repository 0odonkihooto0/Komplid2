import { z } from 'zod';

// Справочник ролей участников строительства (ЦУС)
export const PARTICIPANT_ROLES = [
  'Заказчик',
  'Застройщик',
  'Генподрядчик',
  'Субподрядчик',
  'Авторский надзор',
  'Технический надзор',
  'Строительный контроль',
  'Проектировщик',
  'Экспертная организация',
] as const;

export type ParticipantRoleName = (typeof PARTICIPANT_ROLES)[number];

// Метки типов документа о назначении
export const APPOINTMENT_DOC_TYPE_LABELS: Record<string, string> = {
  ORDER: 'Приказ',
  POWER_OF_ATTORNEY: 'Доверенность',
  DECREE: 'Распоряжение',
  REGULATION: 'Постановление',
  DECISION: 'Решение',
  CHARTER: 'Устав',
};

export const APPOINTMENT_DOC_TYPES = Object.keys(APPOINTMENT_DOC_TYPE_LABELS) as [
  string,
  ...string[],
];

// Дискриминированный union: добавление юрлица или физлица
export const addParticipantSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('org'),
    // Либо существующая организация, либо данные для создания новой
    organizationId: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    inn: z.string().min(10).max(12).optional(),
    address: z.string().optional(),
  }),
  z.object({
    type: z.literal('person'),
    firstName: z.string().min(1, 'Введите имя'),
    lastName: z.string().min(1, 'Введите фамилию'),
    middleName: z.string().optional(),
    organizationId: z.string().uuid().optional(),
    linkedUserId: z.string().uuid().optional(),
  }),
]);

export type AddParticipantInput = z.infer<typeof addParticipantSchema>;

// Схема добавления роли
export const addRoleSchema = z.object({
  roleName: z.enum(PARTICIPANT_ROLES),
  participantType: z.enum(['org', 'person'] as const),
});

export type AddRoleInput = z.infer<typeof addRoleSchema>;

// Схема копирования участника в другой объект
export const copyParticipantSchema = z.object({
  targetObjectId: z.string().uuid('Укажите целевой объект'),
  participantType: z.enum(['org', 'person'] as const),
});

export type CopyParticipantInput = z.infer<typeof copyParticipantSchema>;
