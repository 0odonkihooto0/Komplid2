import type { ReactNode } from 'react';
import { CheckCircle2, XCircle, FileText, Calendar, User, Building2, Folder, Shield } from 'lucide-react';
import { db } from '@/lib/db';

interface Props {
  params: { token: string };
}

// ─────────────────────────────────────────────
// Загрузка документов по QR-токену
// ─────────────────────────────────────────────

async function getProjectDocByToken(token: string) {
  return db.projectDocument.findFirst({
    where: { qrToken: token },
    select: {
      id: true,
      name: true,
      description: true,
      version: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      createdAt: true,
      updatedAt: true,
      uploadedBy: { select: { firstName: true, lastName: true } },
      folder: {
        select: {
          name: true,
          project: { select: { name: true, address: true } },
        },
      },
    },
  });
}

async function getExecutionDocByToken(token: string) {
  return db.executionDoc.findFirst({
    where: { qrToken: token },
    select: {
      id: true,
      number: true,
      type: true,
      status: true,
      title: true,
      createdAt: true,
      signatures: {
        select: {
          signedAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      contract: {
        select: {
          buildingObject: { select: { name: true, address: true } },
        },
      },
    },
  });
}

async function getDesignDocByToken(token: string) {
  return db.designDocument.findFirst({
    where: { qrToken: token },
    select: {
      id: true,
      number: true,
      name: true,
      status: true,
      docType: true,
      buildingObject: { select: { name: true, address: true } },
    },
  });
}

/** Маппинг типов ИД на русские названия */
const EXEC_DOC_TYPE_LABELS: Record<string, string> = {
  AOSR: 'АОСР',
  OZR: 'ОЖР',
  TECHNICAL_READINESS_ACT: 'АТГ',
};

/** Маппинг статусов ИД на русские названия */
const EXEC_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  IN_REVIEW: 'На согласовании',
  SIGNED: 'Подписан',
  REJECTED: 'Отклонён',
};

/** Маппинг статусов ПИР-документов */
const DESIGN_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Создан',
  IN_PROGRESS: 'В работе',
  SENT_FOR_REVIEW: 'На проверке',
  WITH_COMMENTS: 'С замечаниями',
  REVIEW_PASSED: 'Проверка пройдена',
  IN_APPROVAL: 'На согласовании',
  APPROVED: 'Согласован',
  CANCELLED: 'Аннулирован',
};

// ─────────────────────────────────────────────
// Основная страница
// ─────────────────────────────────────────────

export default async function VerifyPage({ params }: Props) {
  // Последовательный поиск: ProjectDocument → ExecutionDoc → DesignDocument
  const projDoc = await getProjectDocByToken(params.token);
  if (projDoc) {
    return (
      <PageWrapper>
        <ProjectDocCard doc={projDoc} />
      </PageWrapper>
    );
  }

  const execDoc = await getExecutionDocByToken(params.token);
  if (execDoc) {
    return (
      <PageWrapper>
        <ExecutionDocCard doc={execDoc} />
      </PageWrapper>
    );
  }

  const designDoc = await getDesignDocByToken(params.token);
  if (designDoc) {
    return (
      <PageWrapper>
        <DesignDocCard doc={designDoc} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <NotFoundCard />
    </PageWrapper>
  );
}

function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white shadow-md">
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Карточка ProjectDocument (существующая логика)
// ─────────────────────────────────────────────

type ProjectDocData = NonNullable<Awaited<ReturnType<typeof getProjectDocByToken>>>;

function ProjectDocCard({ doc }: { doc: ProjectDocData }) {
  const uploaderName = doc.uploadedBy
    ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`.trim()
    : null;

  const uploadDate = new Date(doc.updatedAt).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-6">
      {/* Статус */}
      <div className="mb-5 flex items-center gap-3">
        <CheckCircle2 className="h-8 w-8 shrink-0 text-green-500" />
        <div>
          <p className="font-semibold text-green-700">Документ верифицирован</p>
          <p className="text-sm text-gray-500">Версия актуальна ✓</p>
        </div>
      </div>

      {/* Информация о документе */}
      <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
        <InfoRow icon={<FileText className="h-4 w-4 text-gray-400" />} label="Документ">
          <span className="font-medium">{doc.name}</span>
        </InfoRow>

        <InfoRow icon={<span className="h-4 w-4 text-center text-xs font-bold text-gray-400">v</span>} label="Версия">
          <span className="font-medium text-blue-600">Версия {doc.version}</span>
        </InfoRow>

        <InfoRow icon={<Calendar className="h-4 w-4 text-gray-400" />} label="Дата загрузки">
          {uploadDate}
        </InfoRow>

        {uploaderName && (
          <InfoRow icon={<User className="h-4 w-4 text-gray-400" />} label="Загрузил">
            {uploaderName}
          </InfoRow>
        )}

        {doc.folder?.project?.name && (
          <InfoRow icon={<Building2 className="h-4 w-4 text-gray-400" />} label="Проект">
            <div>
              <p className="font-medium">{doc.folder.project.name}</p>
              {doc.folder.project.address && (
                <p className="text-xs text-gray-500">{doc.folder.project.address}</p>
              )}
            </div>
          </InfoRow>
        )}

        {doc.folder?.name && (
          <InfoRow icon={<Folder className="h-4 w-4 text-gray-400" />} label="Раздел">
            {doc.folder.name}
          </InfoRow>
        )}
      </div>

      <PageFooter />
    </div>
  );
}

// ─────────────────────────────────────────────
// Карточка ExecutionDoc (ИД: АОСР, ОЖР, АТГ)
// ─────────────────────────────────────────────

type ExecDocData = NonNullable<Awaited<ReturnType<typeof getExecutionDocByToken>>>;

/** Бейдж статуса ИД с цветовой индикацией */
function ExecStatusBadge({ status }: { status: string }) {
  const label = EXEC_STATUS_LABELS[status] ?? status;

  if (status === 'SIGNED') {
    return (
      <div className="mb-5 flex items-center gap-3">
        <CheckCircle2 className="h-8 w-8 shrink-0 text-green-500" />
        <div>
          <p className="font-semibold text-green-700">Документ подписан</p>
          <p className="text-sm text-gray-500">Все подписи собраны ✓</p>
        </div>
      </div>
    );
  }

  if (status === 'IN_REVIEW') {
    return (
      <div className="mb-5 flex items-center gap-3">
        <Shield className="h-8 w-8 shrink-0 text-yellow-500" />
        <div>
          <p className="font-semibold text-yellow-700">На согласовании</p>
          <p className="text-sm text-gray-500">Документ ожидает подписей</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 flex items-center gap-3">
      <FileText className="h-8 w-8 shrink-0 text-gray-400" />
      <div>
        <p className="font-semibold text-gray-700">{label}</p>
        <p className="text-sm text-gray-500">Документ зарегистрирован в системе</p>
      </div>
    </div>
  );
}

function ExecutionDocCard({ doc }: { doc: ExecDocData }) {
  const typeLabel = EXEC_DOC_TYPE_LABELS[doc.type] ?? doc.type;

  const createdDate = new Date(doc.createdAt).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-6">
      <ExecStatusBadge status={doc.status} />

      <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
        <InfoRow icon={<FileText className="h-4 w-4 text-gray-400" />} label="Тип документа">
          <span className="font-medium">{typeLabel}</span>
        </InfoRow>

        <InfoRow icon={<span className="h-4 w-4 text-center text-xs font-bold text-gray-400">#</span>} label="Номер">
          <span className="font-medium text-blue-600">{doc.number}</span>
        </InfoRow>

        <InfoRow icon={<FileText className="h-4 w-4 text-gray-400" />} label="Наименование">
          {doc.title}
        </InfoRow>

        <InfoRow icon={<Calendar className="h-4 w-4 text-gray-400" />} label="Дата создания">
          {createdDate}
        </InfoRow>

        {/* Подписанты */}
        {doc.signatures.length > 0 && (
          <InfoRow icon={<User className="h-4 w-4 text-gray-400" />} label="Подписанты">
            <div className="space-y-1">
              {doc.signatures.map((sig, idx) => {
                const signerName = `${sig.user.firstName} ${sig.user.lastName}`.trim();
                const sigDate = new Date(sig.signedAt).toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
                return (
                  <p key={idx}>
                    {signerName} <span className="text-xs text-gray-400">({sigDate})</span>
                  </p>
                );
              })}
            </div>
          </InfoRow>
        )}

        {/* Объект строительства */}
        <InfoRow icon={<Building2 className="h-4 w-4 text-gray-400" />} label="Объект">
          <div>
            <p className="font-medium">{doc.contract.buildingObject.name}</p>
            {doc.contract.buildingObject.address && (
              <p className="text-xs text-gray-500">{doc.contract.buildingObject.address}</p>
            )}
          </div>
        </InfoRow>
      </div>

      <PageFooter />
    </div>
  );
}

// ─────────────────────────────────────────────
// Карточка DesignDocument (ПИР)
// ─────────────────────────────────────────────

type DesignDocData = NonNullable<Awaited<ReturnType<typeof getDesignDocByToken>>>;

function DesignDocCard({ doc }: { doc: DesignDocData }) {
  const statusLabel = DESIGN_STATUS_LABELS[doc.status] ?? doc.status;

  // Определяем цвет бейджа по статусу
  const isApproved = doc.status === 'APPROVED' || doc.status === 'REVIEW_PASSED';
  const isCancelled = doc.status === 'CANCELLED';

  return (
    <div className="p-6">
      {/* Статус */}
      <div className="mb-5 flex items-center gap-3">
        {isApproved ? (
          <CheckCircle2 className="h-8 w-8 shrink-0 text-green-500" />
        ) : isCancelled ? (
          <XCircle className="h-8 w-8 shrink-0 text-red-400" />
        ) : (
          <Shield className="h-8 w-8 shrink-0 text-blue-500" />
        )}
        <div>
          <p className={`font-semibold ${isApproved ? 'text-green-700' : isCancelled ? 'text-red-700' : 'text-blue-700'}`}>
            {statusLabel}
          </p>
          <p className="text-sm text-gray-500">Проектная документация (ПИР)</p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
        <InfoRow icon={<span className="h-4 w-4 text-center text-xs font-bold text-gray-400">#</span>} label="Шифр">
          <span className="font-medium text-blue-600">{doc.number}</span>
        </InfoRow>

        <InfoRow icon={<FileText className="h-4 w-4 text-gray-400" />} label="Наименование">
          {doc.name}
        </InfoRow>

        <InfoRow icon={<Building2 className="h-4 w-4 text-gray-400" />} label="Объект">
          <div>
            <p className="font-medium">{doc.buildingObject.name}</p>
            {doc.buildingObject.address && (
              <p className="text-xs text-gray-500">{doc.buildingObject.address}</p>
            )}
          </div>
        </InfoRow>
      </div>

      <PageFooter />
    </div>
  );
}

// ─────────────────────────────────────────────
// Карточка ошибки
// ─────────────────────────────────────────────

function NotFoundCard() {
  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <XCircle className="h-8 w-8 shrink-0 text-red-400" />
        <div>
          <p className="font-semibold text-red-700">Документ не найден</p>
          <p className="text-sm text-gray-500">QR-код недействителен или устарел</p>
        </div>
      </div>
      <p className="text-center text-sm text-gray-400">
        Обратитесь к ответственному за документ для получения актуальной версии.
      </p>
      <p className="mt-4 text-center text-sm font-semibold text-blue-600">StroyDocs</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Общий подвал карточки
// ─────────────────────────────────────────────

function PageFooter() {
  return (
    <>
      <p className="mt-4 text-center text-xs text-gray-400">
        Эта страница подтверждает актуальность документа.
        <br />
        Скачать файл здесь нельзя.
      </p>
      <p className="mt-4 text-center text-sm font-semibold text-blue-600">StroyDocs</p>
    </>
  );
}

// ─────────────────────────────────────────────
// Вспомогательный компонент строки
// ─────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        <div className="text-sm text-gray-800">{children}</div>
      </div>
    </div>
  );
}
