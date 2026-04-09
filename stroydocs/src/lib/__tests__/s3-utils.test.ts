import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildS3Key, buildExecutionDocKey, buildArchiveKey, buildEstimateKey, buildMaterialDocKey } from '../s3-utils';

// Мокаем зависимости S3, чтобы модуль загрузился без реальных переменных окружения
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));
vi.mock('../s3', () => ({
  s3: {},
}));

describe('buildS3Key', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  it('формирует корректный путь с orgId, entityType и файлом', () => {
    const key = buildS3Key('org-123', 'photos', 'image.png');
    expect(key).toBe('orgs/org-123/photos/1700000000000_image.png');
  });

  it('заменяет спецсимволы в имени файла на _', () => {
    const key = buildS3Key('org-1', 'docs', 'файл (копия).pdf');
    // Кириллица, пробелы и скобки заменяются на _
    expect(key).toMatch(/^orgs\/org-1\/docs\/1700000000000_[a-zA-Z0-9._-]+$/);
    expect(key).not.toMatch(/[^a-zA-Z0-9._\-/]/);
  });

  it('сохраняет безопасные символы в имени файла', () => {
    const key = buildS3Key('org-1', 'docs', 'report-2024_v2.pdf');
    expect(key).toBe('orgs/org-1/docs/1700000000000_report-2024_v2.pdf');
  });
});

describe('buildExecutionDocKey', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  it('формирует путь для исполнительного документа', () => {
    const key = buildExecutionDocKey('org-1', 'contract-1', 'AOSR', 'act.pdf');
    expect(key).toBe('orgs/org-1/execution-docs/contract-1/aosr/1700000000000_act.pdf');
  });
});

describe('buildArchiveKey', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  it('формирует путь для архивного документа', () => {
    const key = buildArchiveKey('org-1', 'contract-1', 'PERMITS', 'permit.pdf');
    expect(key).toBe('orgs/org-1/archive/contract-1/permits/1700000000000_permit.pdf');
  });
});

describe('buildEstimateKey', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  it('формирует путь для файла сметы', () => {
    const key = buildEstimateKey('org-1', 'contract-1', 'estimate.xlsx');
    expect(key).toBe('orgs/org-1/estimates/contract-1/1700000000000_estimate.xlsx');
  });
});

describe('buildMaterialDocKey', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  it('формирует путь для документа материала', () => {
    const key = buildMaterialDocKey('contract-1', 'mat-1', 'cert.pdf');
    expect(key).toBe('materials/contract-1/mat-1/1700000000000_cert.pdf');
  });
});
