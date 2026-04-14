import { z } from 'zod';
import { SpecialJournalType } from '@prisma/client';

// === Типо-зависимые данные записей журнала ===

/** Журнал бетонных работ (СП 70.13330.2012, Приложение Ф) */
export const concreteWorksDataSchema = z.object({
  structureName: z.string().min(1, 'Укажите наименование конструкции'),
  concreteClass: z.string().min(1, 'Укажите класс бетона'),
  concreteMark: z.string().optional(),
  volume: z.number().positive('Объём должен быть больше 0'),
  placementMethod: z.string().min(1, 'Укажите способ укладки'),
  mixTemperature: z.number().optional(),
  curingMethod: z.string().optional(),
  testProtocolNumber: z.string().optional(),
  supplierMixPlant: z.string().optional(),
});

/** Журнал сварочных работ (СП 70.13330.2012, Приложение Б) */
export const weldingWorksDataSchema = z.object({
  jointType: z.enum(['BUTT', 'CORNER', 'T_JOINT', 'LAP']),
  baseMetal: z.string().min(1, 'Укажите марку основного металла'),
  thickness: z.number().positive('Толщина должна быть больше 0'),
  electrodeMark: z.string().min(1, 'Укажите марку электрода'),
  weldingMethod: z.string().min(1, 'Укажите способ сварки'),
  welderStampNumber: z.string().min(1, 'Укажите клеймо сварщика'),
  welderFullName: z.string().min(1, 'Укажите ФИО сварщика'),
  controlType: z.string().optional(),
  controlResult: z.string().optional(),
  controlProtocolNumber: z.string().optional(),
});

/** Журнал авторского надзора (СП 246.1325800.2023, Приложение Б) */
export const authorSupervisionDataSchema = z.object({
  designOrgRepresentative: z.string().min(1, 'Укажите представителя проектной организации'),
  deviationsFound: z.string().optional(),
  instructions: z.string().optional(),
  instructionDeadline: z.string().optional(),
  implementationNote: z.string().optional(),
  relatedDrawings: z.array(z.string()).optional(),
});

// === Основные CRUD-схемы ===

/** Создание специального журнала */
export const createJournalSchema = z.object({
  type: z.nativeEnum(SpecialJournalType),
  title: z.string().min(2, 'Введите наименование журнала').optional(),
  contractId: z.string().uuid().optional(),
  responsibleId: z.string().uuid('Укажите ответственного'),
  normativeRef: z.string().optional(),
});

/** Обновление специального журнала */
export const updateJournalSchema = z.object({
  title: z.string().min(2, 'Введите наименование журнала').optional(),
  contractId: z.string().uuid().optional().nullable(),
  responsibleId: z.string().uuid().optional(),
  normativeRef: z.string().optional().nullable(),
  requisites: z.record(z.string(), z.unknown()).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

/** Создание записи журнала */
export const createJournalEntrySchema = z.object({
  date: z.string().min(1, 'Укажите дату записи'),
  description: z.string().min(1, 'Введите описание работ'),
  location: z.string().optional(),
  normativeRef: z.string().optional(),
  weather: z.string().optional(),
  temperature: z.number().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  inspectionDate: z.string().optional(),
  executionDocId: z.string().uuid().optional(),
});

/** Обновление записи журнала (включая смену статуса) */
export const updateJournalEntrySchema = createJournalEntrySchema.partial().extend({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
});

/** Создание замечания к записи */
export const createRemarkSchema = z.object({
  text: z.string().min(1, 'Введите текст замечания'),
  deadline: z.string().optional(),
});

/** Обновление замечания */
export const updateRemarkSchema = z.object({
  text: z.string().min(1).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
  resolution: z.string().optional(),
  deadline: z.string().optional(),
});

// === Вывод типов ===

export type ConcreteWorksData = z.infer<typeof concreteWorksDataSchema>;
export type WeldingWorksData = z.infer<typeof weldingWorksDataSchema>;
export type AuthorSupervisionData = z.infer<typeof authorSupervisionDataSchema>;
export type CreateJournalInput = z.infer<typeof createJournalSchema>;
export type UpdateJournalInput = z.infer<typeof updateJournalSchema>;
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
export type CreateRemarkInput = z.infer<typeof createRemarkSchema>;
export type UpdateRemarkInput = z.infer<typeof updateRemarkSchema>;
