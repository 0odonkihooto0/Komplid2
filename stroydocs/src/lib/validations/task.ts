import { z } from 'zod';

// ─── Task ───────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(300),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
  deadline: z.string().datetime({ offset: true }).nullable().optional(),
  plannedStartDate: z.string().datetime({ offset: true }).nullable().optional(),
  duration: z.number().int().positive().nullable().optional(),
  projectId: z.string().uuid('Укажите объект строительства'),
  groupId: z.string().uuid().nullable().optional(),
  typeId: z.string().uuid().nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  executors: z.array(z.string().uuid()).min(1, 'Укажите хотя бы одного исполнителя'),
  controllers: z.array(z.string().uuid()).optional().default([]),
  observers: z.array(z.string().uuid()).optional().default([]),
  labelIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  deadline: z.string().datetime({ offset: true }).nullable().optional(),
  plannedStartDate: z.string().datetime({ offset: true }).nullable().optional(),
  duration: z.number().int().positive().nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  typeId: z.string().uuid().nullable().optional(),
  addLabelIds: z.array(z.string().uuid()).optional(),
  removeLabelIds: z.array(z.string().uuid()).optional(),
  addExecutors: z.array(z.string().uuid()).optional(),
  removeExecutors: z.array(z.string().uuid()).optional(),
  addControllers: z.array(z.string().uuid()).optional(),
  removeControllers: z.array(z.string().uuid()).optional(),
  addObservers: z.array(z.string().uuid()).optional(),
  removeObservers: z.array(z.string().uuid()).optional(),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export const taskActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('send-to-review') }),
  z.object({ action: z.literal('cancel-review') }),
  z.object({ action: z.literal('review-start') }),
  z.object({ action: z.literal('accept') }),
  z.object({
    action: z.literal('return-to-revision'),
    comment: z.string().max(1000).optional(),
  }),
  z.object({
    action: z.literal('discuss'),
    comment: z.string().max(1000).optional(),
  }),
  z.object({ action: z.literal('mark-irrelevant') }),
  z.object({
    action: z.literal('redirect'),
    targetUserId: z.string().uuid('Укажите пользователя'),
  }),
  z.object({
    action: z.literal('delegate'),
    targetUserId: z.string().uuid('Укажите пользователя'),
  }),
  z.object({
    action: z.literal('copy'),
    title: z.string().min(1).max(300).optional(),
  }),
  z.object({
    action: z.literal('to-template'),
    name: z.string().min(1, 'Название шаблона обязательно').max(300),
  }),
  z.object({
    action: z.literal('create-subtask'),
    title: z.string().min(1).max(300),
    executors: z.array(z.string().uuid()).min(1, 'Укажите хотя бы одного исполнителя'),
  }),
]);

export type TaskActionInput = z.infer<typeof taskActionSchema>;

// ─── Checklist ───────────────────────────────────────────────────────────────

export const createChecklistItemSchema = z.object({
  title: z.string().min(1, 'Название пункта обязательно').max(500),
  order: z.number().int().optional(),
  s3Keys: z.array(z.string()).optional().default([]),
});

export const updateChecklistItemSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  done: z.boolean().optional(),
  order: z.number().int().optional(),
  s3Keys: z.array(z.string()).optional(),
});

// ─── Reports ─────────────────────────────────────────────────────────────────

export const createTaskReportSchema = z.object({
  progress: z.string().min(1, 'Описание прогресса обязательно').max(5000),
  newDeadline: z.string().datetime({ offset: true }).nullable().optional(),
  s3Keys: z.array(z.string()).optional().default([]),
});

// ─── TaskGroup ───────────────────────────────────────────────────────────────

export const createTaskGroupSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
  parentId: z.string().uuid().nullable().optional(),
  visibility: z.enum(['EVERYONE', 'SELECTED']).default('EVERYONE'),
  visibleUserIds: z.array(z.string().uuid()).optional().default([]),
  order: z.number().int().optional(),
});

export const updateTaskGroupSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  parentId: z.string().uuid().nullable().optional(),
  visibility: z.enum(['EVERYONE', 'SELECTED']).optional(),
  visibleUserIds: z.array(z.string().uuid()).optional(),
  order: z.number().int().optional(),
});

// ─── TaskLabel ───────────────────────────────────────────────────────────────

export const createTaskLabelSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Укажите цвет в формате #RRGGBB').default('#6366f1'),
  groupId: z.string().uuid().nullable().optional(),
});

export const updateTaskLabelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  groupId: z.string().uuid().nullable().optional(),
});

// ─── TaskType ─────────────────────────────────────────────────────────────────

export const createTaskTypeSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z_]+$/, 'Ключ должен содержать только строчные буквы и подчёркивания'),
  name: z.string().min(1, 'Название обязательно').max(100),
});

// ─── TaskTemplate ─────────────────────────────────────────────────────────────

export const createTaskTemplateSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(300),
  description: z.string().max(5000).optional(),
  typeId: z.string().uuid().nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  parentTemplateId: z.string().uuid().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  duration: z.number().int().positive().nullable().optional(),
  s3Keys: z.array(z.string()).optional().default([]),
});

export const updateTaskTemplateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).nullable().optional(),
  typeId: z.string().uuid().nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  parentTemplateId: z.string().uuid().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  duration: z.number().int().positive().nullable().optional(),
  s3Keys: z.array(z.string()).optional(),
});

export const instantiateTemplateSchema = z.object({
  projectId: z.string().uuid('Укажите объект строительства'),
  deadline: z.string().datetime({ offset: true }).nullable().optional(),
  plannedStartDate: z.string().datetime({ offset: true }).nullable().optional(),
  executors: z.array(z.string().uuid()).min(1, 'Укажите хотя бы одного исполнителя'),
  controllers: z.array(z.string().uuid()).optional().default([]),
  observers: z.array(z.string().uuid()).optional().default([]),
});

// ─── TaskSchedule ─────────────────────────────────────────────────────────────

export const createTaskScheduleSchema = z
  .object({
    templateId: z.string().uuid('Укажите шаблон задачи'),
    repeatType: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']),
    interval: z.number().int().positive().default(1),
    weekDays: z.array(z.number().int().min(0).max(6)).optional().default([]),
    monthDays: z.array(z.number().int().min(1).max(31)).optional().default([]),
    startDate: z.string().datetime({ offset: true }),
    endDate: z.string().datetime({ offset: true }).nullable().optional(),
    isActive: z.boolean().optional().default(true),
    createSubTasks: z.boolean().optional().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.repeatType === 'WEEK' && val.weekDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weekDays'],
        message: 'Для еженедельного расписания укажите дни недели',
      });
    }
    if (val.repeatType === 'MONTH' && val.monthDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['monthDays'],
        message: 'Для ежемесячного расписания укажите дни месяца',
      });
    }
  });

export const updateTaskScheduleSchema = z.object({
  repeatType: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']).optional(),
  interval: z.number().int().positive().optional(),
  weekDays: z.array(z.number().int().min(0).max(6)).optional(),
  monthDays: z.array(z.number().int().min(1).max(31)).optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).nullable().optional(),
  isActive: z.boolean().optional(),
  createSubTasks: z.boolean().optional(),
});
