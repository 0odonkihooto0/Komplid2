import { z } from 'zod';
import { ProblemIssueType, ProblemIssueStatus } from '@prisma/client';

export const createQuestionSchema = z.object({
  type:           z.nativeEnum(ProblemIssueType),
  description:    z.string().min(1, 'Введите описание вопроса').max(2000),
  causes:         z.string().max(2000).optional(),
  measuresTaken:  z.string().max(2000).optional(),
  resolutionDate: z.string().datetime({ offset: true }).optional(),
  assigneeOrgId:  z.string().uuid().optional(),
  verifierOrgId:  z.string().uuid().optional(),
});

export const updateQuestionSchema = z.object({
  type:           z.nativeEnum(ProblemIssueType).optional(),
  description:    z.string().min(1).max(2000).optional(),
  causes:         z.string().max(2000).optional().nullable(),
  measuresTaken:  z.string().max(2000).optional().nullable(),
  resolutionDate: z.string().datetime({ offset: true }).optional().nullable(),
  assigneeOrgId:  z.string().uuid().optional().nullable(),
  verifierOrgId:  z.string().uuid().optional().nullable(),
  status:         z.nativeEnum(ProblemIssueStatus).optional(),
});

export const addQuestionAttachmentSchema = z.object({
  fileName: z.string().min(1, 'Укажите имя файла'),
  mimeType: z.string().min(1, 'Укажите MIME-тип'),
  size:     z.number().int().positive('Размер файла должен быть больше 0'),
});
