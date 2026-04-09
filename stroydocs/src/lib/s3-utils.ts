import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from './s3';

const BUCKET = process.env.S3_BUCKET!;

/** Загрузить файл в S3 и вернуть ключ */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

/** Получить pre-signed URL для скачивания (TTL: 1 час) */
export async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

/** Удалить файл из S3 */
export async function deleteFile(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

/** Получить pre-signed URL для загрузки файла в S3 (TTL: 15 мин) */
export async function generateUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 900 });
}

/** Сформировать уникальный S3-ключ для произвольной сущности */
export function buildS3Key(orgId: string, entityType: string, fileName: string): string {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
  return `orgs/${orgId}/${entityType}/${timestamp}_${safeFileName}`;
}

/** Сформировать уникальный S3-ключ для исполнительного документа */
export function buildExecutionDocKey(
  orgId: string,
  contractId: string,
  docType: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
  return `orgs/${orgId}/execution-docs/${contractId}/${docType.toLowerCase()}/${timestamp}_${safeFileName}`;
}

/** Сформировать уникальный S3-ключ для архивного документа */
export function buildArchiveKey(
  orgId: string,
  contractId: string,
  category: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
  return `orgs/${orgId}/archive/${contractId}/${category.toLowerCase()}/${timestamp}_${safeFileName}`;
}

/** Сформировать уникальный S3-ключ для файла сметы */
export function buildEstimateKey(
  orgId: string,
  contractId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
  return `orgs/${orgId}/estimates/${contractId}/${timestamp}_${safeFileName}`;
}

/** Скачать файл из S3 и вернуть Buffer */
export async function downloadFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const response = await s3.send(command);
  const stream = response.Body;
  if (!stream) throw new Error(`Файл не найден в S3: ${key}`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Сформировать уникальный S3-ключ для акта входного контроля */
export function buildInputControlActKey(
  orgId: string,
  contractId: string,
  recordId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
  return `orgs/${orgId}/input-control/${contractId}/${recordId}/${timestamp}_${safeFileName}`;
}

/** Сформировать S3-ключ для документа файлового хранилища проекта */
export function buildProjectDocKey(orgId: string, projectId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
  return `orgs/${orgId}/project-docs/${projectId}/${timestamp}_${safeFileName}`;
}

/** Сформировать S3-ключ для протокола мероприятия */
export function buildEventProtocolKey(
  orgId: string,
  projectId: string,
  eventId: string,
  fileName: string,
): string {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
  return `orgs/${orgId}/events/${projectId}/${eventId}/${timestamp}_${safeFileName}`;
}

/** Сформировать уникальный S3-ключ для PDF журнала */
export function buildJournalKey(
  orgId: string,
  projectId: string,
  journalType: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
  return `orgs/${orgId}/journals/${projectId}/${journalType.toLowerCase()}/${timestamp}_${safeFileName}`;
}

/** Сформировать S3-ключ для IFC-файла ТИМ-модели */
export function buildBimModelKey(orgId: string, projectId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
  return `orgs/${orgId}/bim/${projectId}/${timestamp}_${safeFileName}`;
}

/** Сформировать уникальный S3-ключ для документа материала */
export function buildMaterialDocKey(
  contractId: string,
  materialId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9\u0400-\u04FF._-]/g, '_');
  return `materials/${contractId}/${materialId}/${timestamp}_${safeFileName}`;
}
