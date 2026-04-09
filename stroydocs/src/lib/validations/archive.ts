import { z } from 'zod';

export const createArchiveDocumentSchema = z.object({
  category: z.enum(['PERMITS', 'WORKING_PROJECT', 'EXECUTION_DRAWINGS', 'CERTIFICATES', 'STANDARDS']),
  fileName: z.string().min(1, 'Укажите имя файла'),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  sheetNumber: z.string().optional(),
  cipher: z.string().optional(),
  issueDate: z.string().optional(),
});

export const certifyCopySchema = z.object({
  certifiedByName: z.string().min(1, 'Укажите ФИО заверяющего'),
  certifiedByPos: z.string().min(1, 'Укажите должность заверяющего'),
});

export type CreateArchiveDocumentInput = z.infer<typeof createArchiveDocumentSchema>;
export type CertifyCopyInput = z.infer<typeof certifyCopySchema>;
