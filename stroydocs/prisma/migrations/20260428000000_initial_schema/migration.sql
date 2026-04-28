-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'WORKER', 'CONTROLLER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('MAIN', 'SUBCONTRACT');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('DEVELOPER', 'CONTRACTOR', 'SUPERVISION', 'SUBCONTRACTOR');

-- CreateEnum
CREATE TYPE "FundingType" AS ENUM ('BUDGET', 'EXTRA_BUDGET', 'CREDIT', 'OWN');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'PLANNED', 'IN_PROGRESS', 'UNDER_REVIEW', 'REVISION', 'DONE', 'IRRELEVANT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskRoleType" AS ENUM ('AUTHOR', 'EXECUTOR', 'CONTROLLER', 'OBSERVER');

-- CreateEnum
CREATE TYPE "TaskGroupVisibility" AS ENUM ('EVERYONE', 'SELECTED');

-- CreateEnum
CREATE TYPE "TaskScheduleRepeat" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('MANUAL', 'DEFECT', 'COMMENT');

-- CreateEnum
CREATE TYPE "ProblemIssueType" AS ENUM ('CORRECTION_PSD', 'LAND_LEGAL', 'PRODUCTION', 'ORG_LEGAL', 'CONTRACT_WORK', 'FINANCIAL', 'MATERIAL_SUPPLY', 'WORK_QUALITY', 'DEADLINES', 'OTHER');

-- CreateEnum
CREATE TYPE "ProblemIssueStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "FundingRecordType" AS ENUM ('ALLOCATED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "IndicatorSource" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "AppointmentDocType" AS ENUM ('ORDER', 'POWER_OF_ATTORNEY', 'DECREE', 'REGULATION', 'DECISION', 'CHARTER');

-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'FOREMAN', 'ENGINEER', 'WORKER', 'MEMBER', 'GUEST', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "UserAccountType" AS ENUM ('INDIVIDUAL', 'SELF_EMPLOYED', 'ENTREPRENEUR', 'LEGAL_ENTITY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "UserIntent" AS ENUM ('CONTRACTOR_GENERAL', 'CONTRACTOR_SUB', 'CONTRACTOR_INDIVIDUAL', 'ESTIMATOR', 'PTO_ENGINEER', 'CUSTOMER_PRIVATE', 'CUSTOMER_B2B', 'CONSTRUCTION_SUPERVISOR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'LEFT');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('PROJECT_OWNER', 'PROJECT_MANAGER', 'SITE_FOREMAN', 'SPECIALIST', 'WORKER', 'OBSERVER');

-- CreateEnum
CREATE TYPE "ProjectMemberPolicy" AS ENUM ('WORKSPACE_WIDE', 'ASSIGNED_ONLY');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'SOLO_BASIC', 'SOLO_PRO', 'TEAM', 'CORPORATE');

-- CreateEnum
CREATE TYPE "ProfessionalRole" AS ENUM ('SMETCHIK', 'PTO', 'FOREMAN', 'SK_INSPECTOR', 'SUPPLIER', 'PROJECT_MANAGER', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'GRACE', 'CANCELED', 'CANCELLED', 'EXPIRED', 'INCOMPLETE', 'PAUSED');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('APP', 'TILDA', 'MARKETING', 'API', 'ADMIN', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'WAITING_FOR_CAPTURE', 'AUTHORIZED', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PlanCategory" AS ENUM ('FREEMIUM', 'B2C', 'B2B', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ProfiRole" AS ENUM ('SMETCHIK', 'PTO', 'PRORAB');

-- CreateEnum
CREATE TYPE "CancellationReasonCode" AS ENUM ('TOO_EXPENSIVE', 'MISSING_FEATURES', 'COMPETITOR', 'NOT_USING', 'TECHNICAL_ISSUES', 'TEMPORARY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('PLAN_PAYMENT', 'PLAN_RENEWAL', 'PLAN_UPGRADE', 'PLAN_PRORATION', 'CREDIT_TOPUP', 'REFUND', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('YOOKASSA', 'TINKOFF', 'SBERBANK', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('BANK_CARD', 'SBP', 'YOOMONEY', 'SBERPAY', 'TPAY', 'YANDEX_PAY', 'INVOICE');

-- CreateEnum
CREATE TYPE "SubscriptionEventType" AS ENUM ('CREATED', 'TRIAL_STARTED', 'TRIAL_ENDED', 'TRIAL_CONVERTED', 'RENEWED', 'RENEWAL_FAILED', 'UPGRADED', 'DOWNGRADED', 'PLAN_CHANGE_SCHEDULED', 'CANCELLED', 'REACTIVATED', 'EXPIRED', 'GRACE_STARTED', 'GRACE_EXPIRED', 'PAUSED', 'RESUMED', 'PAYMENT_METHOD_CHANGED', 'DUNNING_START', 'DUNNING_RESOLVED', 'DUNNING_FAILED', 'PROMO_APPLIED', 'MANUAL_EXTENSION');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'ADMIN', 'WEBHOOK', 'API');

-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('PAYMENT', 'PREPAYMENT', 'FULL_PAYMENT', 'REFUND', 'CREDIT');

-- CreateEnum
CREATE TYPE "ReceiptProvider" AS ENUM ('YOOKASSA', 'EVOTOR_CLOUD', 'ATOL_ONLINE', 'NONE');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING', 'SUBMITTED', 'REGISTERED', 'FAILED', 'RETRY');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED_AMOUNT', 'TRIAL_DAYS', 'FREE_MONTHS');

-- CreateEnum
CREATE TYPE "DunningResult" AS ENUM ('SUCCESS', 'FAILED', 'CARD_EXPIRED', 'USER_CANCELLED', 'USER_UPDATED_CARD');

-- CreateEnum
CREATE TYPE "UserDunningAction" AS ENUM ('UPDATED_PAYMENT_METHOD', 'CANCELLED_SUBSCRIPTION', 'IGNORED');

-- CreateEnum
CREATE TYPE "FeatureCategory" AS ENUM ('CORE', 'B2C_SMETCHIK', 'B2C_PTO', 'B2C_PRORAB', 'B2C_CUSTOMER', 'B2B', 'AI', 'INTEGRATIONS', 'MARKETPLACE');

-- CreateEnum
CREATE TYPE "WorkspaceInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaterialDocumentType" AS ENUM ('PASSPORT', 'CERTIFICATE', 'PROTOCOL');

-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('PIECE', 'KG', 'TON', 'M', 'M2', 'M3', 'L', 'SET');

-- CreateEnum
CREATE TYPE "WorkRecordStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExecutionDocType" AS ENUM ('AOSR', 'OZR', 'TECHNICAL_READINESS_ACT', 'GENERAL_DOCUMENT', 'KS_6A', 'KS_11', 'KS_14');

-- CreateEnum
CREATE TYPE "ExecutionDocStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'SIGNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SignatureType" AS ENUM ('DETACHED', 'EMBEDDED', 'SIMPLE');

-- CreateEnum
CREATE TYPE "DocCommentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "IdCategory" AS ENUM ('ACCOUNTING_JOURNAL', 'INSPECTION_ACT', 'OTHER_ID');

-- CreateEnum
CREATE TYPE "ArchiveCategory" AS ENUM ('PERMITS', 'WORKING_PROJECT', 'EXECUTION_DRAWINGS', 'CERTIFICATES', 'STANDARDS', 'LABORATORY');

-- CreateEnum
CREATE TYPE "EstimateFormat" AS ENUM ('XML_GRAND_SMETA', 'XML_RIK', 'EXCEL', 'PDF');

-- CreateEnum
CREATE TYPE "EstimateImportStatus" AS ENUM ('UPLOADING', 'PARSING', 'AI_PROCESSING', 'PREVIEW', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "EstimateItemStatus" AS ENUM ('RECOGNIZED', 'MAPPED', 'UNMATCHED', 'SKIPPED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "EstimateItemType" AS ENUM ('WORK', 'MATERIAL');

-- CreateEnum
CREATE TYPE "InputControlResult" AS ENUM ('CONFORMING', 'NON_CONFORMING', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "InputControlActStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('CONFIRMING', 'VIOLATION');

-- CreateEnum
CREATE TYPE "PhotoEntityType" AS ENUM ('WORK_RECORD', 'MATERIAL', 'REMARK', 'WORK_ITEM', 'CONTRACT', 'DEFECT', 'DAILY_LOG');

-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DefectCategory" AS ENUM ('QUALITY_VIOLATION', 'TECHNOLOGY_VIOLATION', 'FIRE_SAFETY', 'ECOLOGY', 'DOCUMENTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PrescriptionType" AS ENUM ('DEFECT_ELIMINATION', 'WORK_SUSPENSION');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "RemediationActStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SafetyBriefingType" AS ENUM ('INTRODUCTORY', 'PRIMARY', 'TARGETED', 'REPEATED', 'UNSCHEDULED');

-- CreateEnum
CREATE TYPE "ApprovalRouteStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RESET', 'PENDING_REMARKS');

-- CreateEnum
CREATE TYPE "ApprovalStepStatus" AS ENUM ('WAITING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SigningRouteStatus" AS ENUM ('PENDING', 'SIGNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SigningStepStatus" AS ENUM ('WAITING', 'SIGNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Ks2Status" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocTemplateCategory" AS ENUM ('AOSR', 'OZR', 'KS2', 'KS3', 'AVK', 'ZHVK', 'TECH_READINESS', 'OTHER');

-- CreateEnum
CREATE TYPE "GanttDependencyType" AS ENUM ('FS', 'SS', 'FF', 'SF');

-- CreateEnum
CREATE TYPE "GanttTaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ChangeOrderStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CorrespondenceDir" AS ENUM ('OUTGOING', 'INCOMING');

-- CreateEnum
CREATE TYPE "CorrespondenceStatus" AS ENUM ('DRAFT', 'SENT', 'READ', 'IN_APPROVAL', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RFIStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'ANSWERED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RFIPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SEDDocType" AS ENUM ('LETTER', 'ORDER', 'PROTOCOL', 'ACT', 'MEMO', 'NOTIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SEDStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IN_APPROVAL', 'REQUIRES_ACTION', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('DELEGATION', 'APPROVAL', 'REDIRECT', 'MULTI_APPROVAL', 'MULTI_SIGNING', 'DIGITAL_SIGNING', 'REVIEW');

-- CreateEnum
CREATE TYPE "SEDWorkflowStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ContractPaymentType" AS ENUM ('PLAN', 'FACT');

-- CreateEnum
CREATE TYPE "ProjectEventType" AS ENUM ('MEETING', 'GSN_INSPECTION', 'ACCEPTANCE', 'AUDIT', 'COMMISSIONING', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectEventStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "DesignTaskType" AS ENUM ('DESIGN', 'SURVEY');

-- CreateEnum
CREATE TYPE "DesignTaskStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SENT_FOR_REVIEW', 'WITH_COMMENTS', 'REVIEW_PASSED', 'IN_APPROVAL', 'APPROVED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DesignDocType" AS ENUM ('DESIGN_PD', 'WORKING_RD', 'SURVEY', 'REPEATED_USE');

-- CreateEnum
CREATE TYPE "DesignDocStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'SENT_FOR_REVIEW', 'WITH_COMMENTS', 'REVIEW_PASSED', 'IN_APPROVAL', 'APPROVED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DesignCommentStatus" AS ENUM ('ACTIVE', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ExpertiseStatus" AS ENUM ('NOT_SUBMITTED', 'IN_PROCESS', 'APPROVED_POSITIVE', 'APPROVED_NEGATIVE', 'REVISION_REQUIRED');

-- CreateEnum
CREATE TYPE "PIRClosureStatus" AS ENUM ('DRAFT', 'CONDUCTED', 'IN_APPROVAL', 'SIGNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EstimateVersionType" AS ENUM ('BASELINE', 'ACTUAL', 'CORRECTIVE');

-- CreateEnum
CREATE TYPE "EstimateVersionStatus" AS ENUM ('OK', 'EDITING', 'RECALCULATING', 'ERROR');

-- CreateEnum
CREATE TYPE "EstimateAdditionalCostType" AS ENUM ('ACCRUAL_BY_WORK_TYPE', 'ACCRUAL_TO_TOTALS', 'TEMP_BUILDINGS', 'WINTER_MARKUP', 'ADDITIONAL_CURRENT_PRICES', 'DEFLATOR_INDEX', 'MINUS_CUSTOMER_RESOURCES', 'VAT');

-- CreateEnum
CREATE TYPE "EstimateAdditionalCostApplicationMode" AS ENUM ('BY_CHAPTERS', 'BY_ESTIMATES', 'BY_CHAPTERS_AND_ESTIMATES');

-- CreateEnum
CREATE TYPE "EstimateCalculationMethod" AS ENUM ('COEFFICIENT', 'PERCENT', 'FIXED_SUM');

-- CreateEnum
CREATE TYPE "MaterialRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierOrderType" AS ENUM ('SUPPLIER_ORDER', 'WAREHOUSE_REQUEST', 'SUPPLIER_INQUIRY');

-- CreateEnum
CREATE TYPE "SupplierOrderStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarehouseMovementType" AS ENUM ('RECEIPT', 'SHIPMENT', 'TRANSFER', 'WRITEOFF', 'RETURN', 'RECEIPT_ORDER', 'EXPENSE_ORDER');

-- CreateEnum
CREATE TYPE "WarehouseMovStatus" AS ENUM ('DRAFT', 'CONDUCTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SpecialJournalType" AS ENUM ('CONCRETE_WORKS', 'WELDING_WORKS', 'AUTHOR_SUPERVISION', 'MOUNTING_WORKS', 'ANTICORROSION', 'GEODETIC', 'EARTHWORKS', 'PILE_DRIVING', 'CABLE_LAYING', 'FIRE_SAFETY', 'OZR_1026PR', 'OZR_RD_11_05', 'INPUT_CONTROL', 'CONSTRUCTION_CONTROL', 'CONSTRUCTION_CONTROL_V2', 'SK_CALL_REGISTER', 'AUTHOR_SUPERVISION_2016', 'DRILLING_WORKS', 'CONCRETE_CURING', 'JOINT_GROUTING', 'ANTICORROSION_WELD', 'BOLT_CONNECTIONS', 'TORQUE_WRENCH_CALIBRATION', 'CABLE_TUBE', 'CABLE_ROUTE', 'PIPELINE_WELDING', 'INSULATION_LAYING', 'TECHNICAL_LEVELING', 'FIRE_SAFETY_INTRO', 'GENERAL_INTRO_BRIEFING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('ACTIVE', 'STORAGE', 'CLOSED');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JournalLinkType" AS ENUM ('OZR_TO_JVK', 'OZR_TO_AOSR', 'GENERIC');

-- CreateEnum
CREATE TYPE "BimModelStatus" AS ENUM ('PROCESSING', 'CONVERTING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "BimModelStage" AS ENUM ('OTR', 'PROJECT', 'WORKING', 'CONSTRUCTION');

-- CreateEnum
CREATE TYPE "BimAccessLevel" AS ENUM ('VIEW', 'ADD', 'EDIT', 'DELETE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'SIGNED');

-- CreateEnum
CREATE TYPE "ReportBlockType" AS ENUM ('TITLE_PAGE', 'WORK_VOLUMES', 'KS2_ACTS', 'ID_STATUS', 'DEFECTS_SUMMARY', 'GPR_PROGRESS', 'PHOTO_REPORT', 'FUNDING_STATUS', 'DAILY_LOG_SUMMARY', 'FREE_TEXT', 'CUSTOM_TABLE');

-- CreateEnum
CREATE TYPE "ReferenceAuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('CREDIT', 'CASHBACK');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('PENDING', 'GRANTED', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('REFERRAL_BONUS', 'PAYMENT_DEDUCTION', 'MANUAL_ADJUSTMENT', 'REFUND');

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "requiresPersonalWorkspace" BOOLEAN NOT NULL DEFAULT false,
    "priceMonthlyRub" INTEGER NOT NULL DEFAULT 0,
    "priceYearlyRub" INTEGER NOT NULL DEFAULT 0,
    "limits" JSONB NOT NULL DEFAULT '{}',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "PlanCategory",
    "targetRole" "ProfessionalRole",
    "profiRole" "ProfiRole",
    "billingPeriod" "BillingPeriod",
    "priceRub" INTEGER,
    "oldPriceRub" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "maxObjects" INTEGER,
    "maxUsers" INTEGER,
    "maxGuests" INTEGER,
    "maxStorageGb" INTEGER,
    "maxEstimatesPerMonth" INTEGER,
    "maxAosrPerMonth" INTEGER,
    "maxActiveObjects" INTEGER,
    "maxJournalEntriesPerMonth" INTEGER,
    "maxPublicLinksActive" INTEGER,
    "features" JSONB NOT NULL DEFAULT '[]',
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "trialFeatures" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_features" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" "FeatureCategory" NOT NULL,
    "isLimited" BOOLEAN NOT NULL DEFAULT false,
    "defaultLimit" INTEGER,

    CONSTRAINT "subscription_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_features" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "limit" INTEGER,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "billingPeriod" "BillingPeriod" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "yookassaSubscriptionId" TEXT,
    "startedAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "cancelReason" "CancellationReasonCode",
    "cancelFeedback" TEXT,
    "effectiveEndDate" TIMESTAMP(3),
    "pendingPlanId" TEXT,
    "pendingPlanChangeAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "defaultPaymentMethodId" TEXT,
    "graceUntil" TIMESTAMP(3),
    "dunningAttempts" INTEGER NOT NULL DEFAULT 0,
    "nextDunningAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "PaymentSource" NOT NULL DEFAULT 'APP',
    "status" "PaymentStatus" NOT NULL,
    "amountRub" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "yookassaPaymentId" TEXT,
    "yookassaIdempotencyKey" TEXT,
    "referralCreditApplied" INTEGER NOT NULL DEFAULT 0,
    "referralDiscountApplied" INTEGER NOT NULL DEFAULT 0,
    "referralId" TEXT,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "type" "PaymentType",
    "billingPeriod" "BillingPeriod",
    "description" TEXT,
    "metadata" JSONB,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'YOOKASSA',
    "providerPaymentId" TEXT,
    "providerIdempotenceKey" TEXT,
    "providerMetadata" JSONB,
    "requiresCapture" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3),
    "confirmationUrl" TEXT,
    "paymentMethodId" TEXT,
    "savePaymentMethod" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethodSnapshot" JSONB,
    "promoCodeId" TEXT,
    "discountRub" INTEGER,
    "originalAmountRub" INTEGER,
    "refundedAmountRub" INTEGER,
    "refundReason" TEXT,
    "invoiceId" TEXT,
    "receiptId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inn" TEXT NOT NULL,
    "ogrn" TEXT,
    "sroName" TEXT,
    "sroNumber" TEXT,
    "sroInn" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "type" "WorkspaceType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "organizationId" TEXT,
    "ownerId" TEXT NOT NULL,
    "activeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "specialization" TEXT,
    "title" TEXT,
    "guestScope" JSONB,
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "deactivatedAt" TIMESTAMP(3),
    "deactivationReason" TEXT,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workspaceMemberId" TEXT NOT NULL,
    "projectRole" "ProjectRole" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'WORKER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "activeWorkspaceId" TEXT,
    "professionalRole" "ProfessionalRole",
    "accountType" "UserAccountType" NOT NULL DEFAULT 'UNKNOWN',
    "intent" "UserIntent" NOT NULL DEFAULT 'UNKNOWN',
    "fullName" TEXT,
    "inn" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" TEXT,
    "signupSource" TEXT,
    "referredByCode" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "firstTouchAt" TIMESTAMP(3),
    "signupIpHash" TEXT,
    "signupUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'WORKER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "organizationId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "specialization" TEXT,
    "title" TEXT,
    "invitedById" TEXT NOT NULL,
    "status" "WorkspaceInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building_objects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "generalContractor" TEXT,
    "customer" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "cadastralNumber" TEXT,
    "area" DOUBLE PRECISION,
    "floors" INTEGER,
    "responsibilityClass" TEXT,
    "permitNumber" TEXT,
    "permitDate" TIMESTAMP(3),
    "permitAuthority" TEXT,
    "designOrg" TEXT,
    "chiefEngineer" TEXT,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "constructionType" TEXT,
    "region" TEXT,
    "stroyka" TEXT,
    "shortName" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "fillDatesFromGpr" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "memberPolicy" "ProjectMemberPolicy" NOT NULL DEFAULT 'WORKSPACE_WIDE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "building_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContractType" NOT NULL DEFAULT 'MAIN',
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION,
    "executionStatus" TEXT,
    "vatRate" DOUBLE PRECISION,
    "vatAmount" DOUBLE PRECISION,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "factStartDate" TIMESTAMP(3),
    "factEndDate" TIMESTAMP(3),
    "categoryId" TEXT,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "parentContractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractKindId" TEXT,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_participants" (
    "id" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "appointmentOrder" TEXT,
    "appointmentDate" TIMESTAMP(3),
    "representativeName" TEXT,
    "position" TEXT,
    "contractId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ksi_nodes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tableCode" TEXT,
    "externalId" TEXT,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ksi_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_items" (
    "id" TEXT NOT NULL,
    "projectCipher" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT,
    "volume" DOUBLE PRECISION,
    "normatives" TEXT,
    "ksiNodeId" TEXT,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplier" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "unit" "MeasurementUnit" NOT NULL DEFAULT 'PIECE',
    "quantityReceived" DOUBLE PRECISION NOT NULL,
    "quantityUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractId" TEXT NOT NULL,
    "workItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_documents" (
    "id" TEXT NOT NULL,
    "type" "MaterialDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "materialId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_batches" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "storageLocation" TEXT,
    "materialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "input_control_records" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "result" "InputControlResult" NOT NULL,
    "notes" TEXT,
    "batchId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "input_control_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "input_control_acts" (
    "id" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "InputControlActStatus" NOT NULL DEFAULT 'DRAFT',
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "input_control_acts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_records" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "description" TEXT,
    "normative" TEXT,
    "status" "WorkRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "workItemId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_writeoffs" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "workRecordId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_writeoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "entityType" "PhotoEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "takenAt" TIMESTAMP(3),
    "annotations" JSONB,
    "category" "PhotoCategory",
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_docs" (
    "id" TEXT NOT NULL,
    "type" "ExecutionDocType" NOT NULL,
    "status" "ExecutionDocStatus" NOT NULL DEFAULT 'DRAFT',
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "s3Key" TEXT,
    "fileName" TEXT,
    "generatedAt" TIMESTAMP(3),
    "contractId" TEXT NOT NULL,
    "workRecordId" TEXT,
    "createdById" TEXT NOT NULL,
    "overrideFields" JSONB,
    "overrideHtml" TEXT,
    "lastEditedAt" TIMESTAMP(3),
    "lastEditedById" TEXT,
    "qrToken" TEXT,
    "qrCodeS3Key" TEXT,
    "storageMode" BOOLEAN NOT NULL DEFAULT false,
    "storageModeAt" TIMESTAMP(3),
    "factVolume" DOUBLE PRECISION,
    "idCategory" "IdCategory",
    "categoryId" TEXT,
    "stampType" TEXT,
    "stampX" DOUBLE PRECISION,
    "stampY" DOUBLE PRECISION,
    "stampPage" INTEGER,
    "stampS3Key" TEXT,
    "xmlExportedAt" TIMESTAMP(3),
    "xmlS3Key" TEXT,
    "documentDate" TIMESTAMP(3),
    "note" TEXT,
    "attachmentS3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publicShareToken" TEXT,
    "publicShareExpiresAt" TIMESTAMP(3),
    "publicShareViewCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "execution_docs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_doc_links" (
    "id" TEXT NOT NULL,
    "sourceDocId" TEXT NOT NULL,
    "targetDocId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_doc_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signing_routes" (
    "id" TEXT NOT NULL,
    "status" "SigningRouteStatus" NOT NULL DEFAULT 'PENDING',
    "executionDocId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signing_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signing_steps" (
    "id" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "status" "SigningStepStatus" NOT NULL DEFAULT 'WAITING',
    "signedAt" TIMESTAMP(3),
    "certificateInfo" TEXT,
    "userId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signing_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ks_act_form_data" (
    "id" TEXT NOT NULL,
    "designOrg" TEXT,
    "designOrgInn" TEXT,
    "objectDesc" TEXT,
    "totalArea" DOUBLE PRECISION,
    "buildingVolume" DOUBLE PRECISION,
    "floorCount" INTEGER,
    "constructionClass" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "deviations" TEXT,
    "constructionCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "documents" TEXT,
    "conclusion" TEXT,
    "participants" JSONB,
    "indicators" JSONB,
    "workList" JSONB,
    "commissionMembers" JSONB,
    "executionDocId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ks_act_form_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_routes" (
    "id" TEXT NOT NULL,
    "status" "ApprovalRouteStatus" NOT NULL DEFAULT 'PENDING',
    "currentStepIdx" INTEGER NOT NULL DEFAULT 0,
    "documentType" TEXT,
    "executionDocId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "specialJournalId" TEXT,

    CONSTRAINT "approval_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "status" "ApprovalStepStatus" NOT NULL DEFAULT 'WAITING',
    "comment" TEXT,
    "userId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "routeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" TEXT NOT NULL,
    "signatureType" "SignatureType" NOT NULL,
    "s3Key" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "executionDocId" TEXT NOT NULL,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "gpsAccuracy" DOUBLE PRECISION,
    "signedAtLocation" JSONB,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_comments" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "status" "DocCommentStatus" NOT NULL DEFAULT 'OPEN',
    "commentNumber" INTEGER,
    "urgency" TEXT,
    "remarkType" TEXT,
    "watcherIds" TEXT[],
    "plannedResolveDate" TIMESTAMP(3),
    "actualResolveDate" TIMESTAMP(3),
    "suggestion" TEXT,
    "attachmentS3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "executionDocId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "responsibleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_comment_replies" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attachmentS3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "commentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_comment_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archive_documents" (
    "id" TEXT NOT NULL,
    "category" "ArchiveCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sheetNumber" TEXT,
    "cipher" TEXT,
    "issueDate" TIMESTAMP(3),
    "certifiedCopy" BOOLEAN NOT NULL DEFAULT false,
    "certifiedByName" TEXT,
    "certifiedByPos" TEXT,
    "certifiedS3Key" TEXT,
    "contractId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "archive_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ks2_acts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "Ks2Status" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "s3Key" TEXT,
    "fileName" TEXT,
    "generatedAt" TIMESTAMP(3),
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "excludedAdditionalCostIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "correctionToKs2Id" TEXT,

    CONSTRAINT "ks2_acts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ks2_items" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ks2ActId" TEXT NOT NULL,
    "workItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ks2_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ks3_certificates" (
    "id" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "Ks2Status" NOT NULL DEFAULT 'DRAFT',
    "s3Key" TEXT,
    "fileName" TEXT,
    "generatedAt" TIMESTAMP(3),
    "contractId" TEXT NOT NULL,
    "ks2ActId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ks3_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "id_registries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sheetCount" INTEGER NOT NULL DEFAULT 0,
    "s3Key" TEXT,
    "fileName" TEXT,
    "generatedAt" TIMESTAMP(3),
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "id_registries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_imports" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileS3Key" TEXT NOT NULL,
    "fileHash" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "format" "EstimateFormat",
    "status" "EstimateImportStatus" NOT NULL DEFAULT 'UPLOADING',
    "errorMessage" TEXT,
    "parsedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "itemsTotal" INTEGER NOT NULL DEFAULT 0,
    "itemsMapped" INTEGER NOT NULL DEFAULT 0,
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_import_items" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "rawName" TEXT NOT NULL,
    "rawUnit" TEXT,
    "volume" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "status" "EstimateItemStatus" NOT NULL DEFAULT 'RECOGNIZED',
    "itemType" "EstimateItemType" NOT NULL DEFAULT 'WORK',
    "normativeRefs" TEXT[],
    "suggestedKsiNodeId" TEXT,
    "workItemId" TEXT,
    "parentItemId" TEXT,
    "importId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_import_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DocTemplateCategory" NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'docx',
    "localPath" TEXT,
    "s3Key" TEXT,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "workType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "entityType" TEXT,
    "entityId" TEXT,
    "entityName" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gantt_versions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contractId" TEXT,
    "stageId" TEXT,
    "isDirective" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "description" TEXT,
    "delegatedFromOrgId" TEXT,
    "delegatedToOrgId" TEXT,
    "delegatedFromVersionId" TEXT,
    "calculationMethod" TEXT DEFAULT 'MANUAL',
    "allowOverplan" BOOLEAN NOT NULL DEFAULT false,
    "showSummaryRow" BOOLEAN NOT NULL DEFAULT false,
    "lockWorks" BOOLEAN NOT NULL DEFAULT false,
    "lockPlan" BOOLEAN NOT NULL DEFAULT false,
    "lockFact" BOOLEAN NOT NULL DEFAULT false,
    "disableVolumeRounding" BOOLEAN NOT NULL DEFAULT true,
    "linkedVersionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accessOrgIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "columnSettings" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gantt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gantt_tasks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "status" "GanttTaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "planStart" TIMESTAMP(3) NOT NULL,
    "planEnd" TIMESTAMP(3) NOT NULL,
    "factStart" TIMESTAMP(3),
    "factEnd" TIMESTAMP(3),
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "versionId" TEXT NOT NULL,
    "parentId" TEXT,
    "workItemId" TEXT,
    "contractId" TEXT,
    "directiveStart" TIMESTAMP(3),
    "directiveEnd" TIMESTAMP(3),
    "volume" DOUBLE PRECISION,
    "volumeUnit" TEXT,
    "amount" DOUBLE PRECISION,
    "factVolume" DOUBLE PRECISION,
    "isMilestone" BOOLEAN NOT NULL DEFAULT false,
    "calendarType" TEXT,
    "linkedExecutionDocsCount" INTEGER NOT NULL DEFAULT 0,
    "estimateItemId" TEXT,
    "manHours" DOUBLE PRECISION,
    "machineHours" DOUBLE PRECISION,
    "amountVat" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "comment" TEXT,
    "costType" TEXT,
    "workType" TEXT,
    "basis" TEXT,
    "materialDistribution" TEXT DEFAULT 'UNIFORM',
    "calcType" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delegatedToVersionId" TEXT,
    "sourceTaskId" TEXT,
    "attachmentS3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "taskContractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gantt_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gantt_task_exec_docs" (
    "ganttTaskId" TEXT NOT NULL,
    "execDocId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "gantt_task_exec_docs_pkey" PRIMARY KEY ("ganttTaskId","execDocId")
);

-- CreateTable
CREATE TABLE "gantt_dependencies" (
    "id" TEXT NOT NULL,
    "type" "GanttDependencyType" NOT NULL DEFAULT 'FS',
    "lagDays" INTEGER NOT NULL DEFAULT 0,
    "predecessorId" TEXT NOT NULL,
    "successorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gantt_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gantt_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gantt_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gantt_daily_plans" (
    "id" TEXT NOT NULL,
    "planDate" TIMESTAMP(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "workers" INTEGER,
    "machinery" TEXT,
    "volume" DOUBLE PRECISION,
    "unit" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gantt_daily_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gantt_calendars" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "workDays" JSONB NOT NULL,
    "workHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "holidays" JSONB NOT NULL DEFAULT '[]',
    "versionId" TEXT,
    "taskId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gantt_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gantt_change_logs" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "taskId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gantt_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "DefectCategory" NOT NULL DEFAULT 'OTHER',
    "status" "DefectStatus" NOT NULL DEFAULT 'OPEN',
    "normativeRef" TEXT,
    "deadline" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "annotations" JSONB,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "projectId" TEXT NOT NULL,
    "contractId" TEXT,
    "authorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "requiresSuspension" BOOLEAN NOT NULL DEFAULT false,
    "inspectionId" TEXT,
    "prescriptionId" TEXT,
    "deputyInspectorId" TEXT,
    "substituteInspectorId" TEXT,
    "categoryRefId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "defects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "DefectCategory" NOT NULL,
    "normativeRef" TEXT,
    "requirements" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_comments" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "statusChange" "DefectStatus",
    "defectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_annotations" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "data" JSONB NOT NULL,
    "defectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "colSpan" INTEGER NOT NULL DEFAULT 1,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_logs" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weather" TEXT,
    "temperature" INTEGER,
    "workersCount" INTEGER,
    "notes" TEXT,
    "contractId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_portal_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_portal_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "ChangeOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "changeType" TEXT,
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding_sources" (
    "id" TEXT NOT NULL,
    "type" "FundingType" NOT NULL,
    "budgetTypeId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "actualAmount" DOUBLE PRECISION,
    "period" TEXT,
    "notes" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funding_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "deadline" TIMESTAMP(3),
    "sourceType" "TaskSource" NOT NULL DEFAULT 'MANUAL',
    "projectId" TEXT NOT NULL,
    "contractId" TEXT,
    "defectId" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentTaskId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "versionId" TEXT,
    "typeId" TEXT,
    "groupId" TEXT,
    "templateId" TEXT,
    "plannedStartDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "isReadByAuthor" BOOLEAN NOT NULL DEFAULT true,
    "publicLinkToken" TEXT,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_management_versions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_management_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correspondences" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "direction" "CorrespondenceDir" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "status" "CorrespondenceStatus" NOT NULL DEFAULT 'DRAFT',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "tags" TEXT[],
    "projectId" TEXT NOT NULL,
    "senderOrgId" TEXT NOT NULL,
    "receiverOrgId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "searchVector" tsvector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "correspondences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correspondence_attachments" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correspondenceId" TEXT NOT NULL,

    CONSTRAINT "correspondence_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfis" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RFIStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "RFIPriority" NOT NULL DEFAULT 'MEDIUM',
    "deadline" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "linkedDocId" TEXT,
    "linkedDocType" TEXT,
    "response" TEXT,
    "answeredAt" TIMESTAMP(3),
    "answeredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "searchVector" tsvector,

    CONSTRAINT "rfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfi_attachments" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rfiId" TEXT NOT NULL,

    CONSTRAINT "rfi_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_documents" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "docType" "SEDDocType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" "SEDStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[],
    "projectId" TEXT NOT NULL,
    "senderOrgId" TEXT NOT NULL,
    "receiverOrgIds" TEXT[],
    "authorId" TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "searchVector" tsvector,
    "incomingNumber" TEXT,
    "outgoingNumber" TEXT,
    "date" TIMESTAMP(3),
    "senderUserId" TEXT,
    "receiverUserId" TEXT,
    "receiverOrgId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "observers" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sed_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_attachments" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sedDocId" TEXT NOT NULL,

    CONSTRAINT "sed_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contractId" TEXT,
    "authorId" TEXT NOT NULL,
    "attachmentType" TEXT,
    "attachmentId" TEXT,
    "replyToId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trackPayments" BOOLEAN NOT NULL DEFAULT true,
    "includeInPaymentWidget" BOOLEAN NOT NULL DEFAULT false,
    "executionStage" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_payments" (
    "id" TEXT NOT NULL,
    "paymentType" "ContractPaymentType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "budgetType" TEXT,
    "limitYear" INTEGER,
    "limitAmount" DOUBLE PRECISION,
    "description" TEXT,
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_obligations" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_advances" (
    "id" TEXT NOT NULL,
    "number" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "budgetType" TEXT,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_executions" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "completionPercent" DOUBLE PRECISION,
    "workersCount" INTEGER,
    "equipmentCount" INTEGER,
    "notes" TEXT,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_guarantees" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION,
    "retentionDate" TIMESTAMP(3),
    "releaseDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RETAINED',
    "description" TEXT,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_guarantees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_detail_infos" (
    "id" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldValue" TEXT,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_detail_infos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_financial_tables" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "rows" JSONB NOT NULL,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_financial_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_doc_links" (
    "id" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_doc_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "pinTop" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActual" BOOLEAN NOT NULL DEFAULT true,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "qrCodeS3Key" TEXT,
    "qrToken" TEXT,
    "folderId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_document_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "comment" TEXT,
    "uploadedById" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "ProjectEventType" NOT NULL,
    "status" "ProjectEventStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "notifyDays" INTEGER NOT NULL DEFAULT 3,
    "projectId" TEXT NOT NULL,
    "contractId" TEXT,
    "organizerId" TEXT NOT NULL,
    "participantIds" TEXT[],
    "protocolS3Key" TEXT,
    "protocolFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_tasks" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "docDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskType" "DesignTaskType" NOT NULL DEFAULT 'DESIGN',
    "status" "DesignTaskStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "agreedById" TEXT,
    "customerOrgId" TEXT,
    "customerPersonId" TEXT,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "s3Keys" TEXT[],
    "approvalRouteId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_task_params" (
    "id" TEXT NOT NULL,
    "paramKey" TEXT NOT NULL,
    "paramName" TEXT NOT NULL,
    "value" TEXT,
    "order" INTEGER NOT NULL,
    "hasComment" BOOLEAN NOT NULL DEFAULT false,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "design_task_params_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_task_comments" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "DesignCommentStatus" NOT NULL DEFAULT 'ACTIVE',
    "paramKey" TEXT,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedById" TEXT,
    "s3Keys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_documents" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "docType" "DesignDocType" NOT NULL,
    "category" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DesignDocStatus" NOT NULL DEFAULT 'CREATED',
    "responsibleOrgId" TEXT,
    "responsibleUserId" TEXT,
    "notes" TEXT,
    "linkedExecDocIds" TEXT[],
    "qrToken" TEXT,
    "qrCodeS3Key" TEXT,
    "expertiseStatus" "ExpertiseStatus",
    "expertiseDate" TIMESTAMP(3),
    "expertiseComment" TEXT,
    "s3Keys" TEXT[],
    "currentS3Key" TEXT,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "parentDocId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "sentForExpertise" BOOLEAN NOT NULL DEFAULT false,
    "reviewerOrgId" TEXT,
    "reviewerUserId" TEXT,
    "reviewerComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_doc_comments" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "commentType" TEXT,
    "urgency" TEXT,
    "deadline" TIMESTAMP(3),
    "status" "DesignCommentStatus" NOT NULL DEFAULT 'ACTIVE',
    "requiresAttention" BOOLEAN NOT NULL DEFAULT false,
    "docId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedById" TEXT,
    "s3Keys" TEXT[],
    "plannedResolutionDate" TIMESTAMP(3),
    "suggestion" TEXT,
    "watchers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_doc_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pir_registries" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "senderOrgId" TEXT,
    "receiverOrgId" TEXT,
    "senderPersonId" TEXT,
    "receiverPersonId" TEXT,
    "notes" TEXT,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "expertiseStatus" "ExpertiseStatus",
    "expertiseDate" TIMESTAMP(3),
    "expertiseS3Keys" TEXT[],
    "expertiseComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pir_registries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pir_registry_items" (
    "id" TEXT NOT NULL,
    "registryId" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pir_registry_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pir_closure_acts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "PIRClosureStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "ganttVersionId" TEXT,
    "contractorOrgId" TEXT,
    "customerOrgId" TEXT,
    "totalAmount" DOUBLE PRECISION,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "s3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pir_closure_acts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pir_closure_items" (
    "id" TEXT NOT NULL,
    "actId" TEXT NOT NULL,
    "workName" TEXT NOT NULL,
    "unit" TEXT,
    "volume" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,

    CONSTRAINT "pir_closure_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_template_levels" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "requiresPreviousApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_template_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_doc_changes" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "changeDescription" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_doc_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_stamps" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "stampText" TEXT NOT NULL,
    "titleId" TEXT,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "page" INTEGER NOT NULL,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_stamps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stamp_titles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "template" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stamp_titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_versions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "versionType" "EstimateVersionType" NOT NULL DEFAULT 'ACTUAL',
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "isActual" BOOLEAN NOT NULL DEFAULT true,
    "period" TEXT,
    "notes" TEXT,
    "sourceImportId" TEXT,
    "parentVersionId" TEXT,
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "totalLabor" DOUBLE PRECISION,
    "totalMat" DOUBLE PRECISION,
    "status" "EstimateVersionStatus" NOT NULL DEFAULT 'OK',
    "categoryId" TEXT,
    "publicShareToken" TEXT,
    "publicShareMode" TEXT,
    "publicCompareWithVersionId" TEXT,
    "publicShareExpiresAt" TIMESTAMP(3),
    "publicShareViewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_chapters" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "versionId" TEXT NOT NULL,
    "parentId" TEXT,
    "totalAmount" DOUBLE PRECISION,
    "totalLabor" DOUBLE PRECISION,
    "totalMat" DOUBLE PRECISION,

    CONSTRAINT "estimate_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_items" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "itemType" "EstimateItemType" NOT NULL DEFAULT 'WORK',
    "code" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "volume" DOUBLE PRECISION,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "laborCost" DOUBLE PRECISION,
    "materialCost" DOUBLE PRECISION,
    "machineryCost" DOUBLE PRECISION,
    "priceIndex" DOUBLE PRECISION DEFAULT 1.0,
    "overhead" DOUBLE PRECISION,
    "profit" DOUBLE PRECISION,
    "ksiNodeId" TEXT,
    "workItemId" TEXT,
    "importItemId" TEXT,
    "chapterId" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isCustomerResource" BOOLEAN NOT NULL DEFAULT false,
    "ssrWorkType" TEXT,
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_change_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "versionId" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimate_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_contracts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "contractId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_contract_versions" (
    "id" TEXT NOT NULL,
    "estimateContractId" TEXT NOT NULL,
    "estimateVersionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "estimate_contract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimate_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_additional_costs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costType" "EstimateAdditionalCostType" NOT NULL,
    "applicationMode" "EstimateAdditionalCostApplicationMode" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "value" TEXT,
    "constructionWorks" TEXT,
    "mountingWorks" TEXT,
    "equipment" TEXT,
    "other" TEXT,
    "calculationMethod" "EstimateCalculationMethod" NOT NULL,
    "useCustomPrecision" BOOLEAN NOT NULL DEFAULT false,
    "precision" INTEGER,
    "versionId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_additional_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_additional_cost_chapters" (
    "id" TEXT NOT NULL,
    "additionalCostId" TEXT NOT NULL,
    "chapterName" TEXT NOT NULL,

    CONSTRAINT "estimate_additional_cost_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_additional_cost_estimates" (
    "id" TEXT NOT NULL,
    "additionalCostId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "estimate_additional_cost_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_coefficients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "application" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "versionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_coefficients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_nomenclature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "category" TEXT,
    "vendorCode" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_nomenclature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_requests" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "MaterialRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "deliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "paymentDate" TIMESTAMP(3),
    "paymentAmount" DOUBLE PRECISION,
    "type" TEXT NOT NULL DEFAULT 'REQUEST',
    "supplierOrgId" TEXT,
    "managerId" TEXT,
    "responsibleId" TEXT,
    "approvedById" TEXT,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attachmentS3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "material_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_request_items" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "quantityOrdered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "notes" TEXT,
    "statusId" TEXT,
    "purchaseUnit" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "paymentDeadline" TIMESTAMP(3),
    "costArticle" TEXT,
    "purchasePrice" DOUBLE PRECISION,
    "purchaseQty" DOUBLE PRECISION,
    "nomenclatureId" TEXT,
    "materialId" TEXT,
    "ganttTaskId" TEXT,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "material_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_request_comments" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_request_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_request_item_statuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "material_request_item_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "SupplierOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "SupplierOrderType" NOT NULL DEFAULT 'SUPPLIER_ORDER',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "externalNumber" TEXT,
    "expectedReadyDate" TIMESTAMP(3),
    "expectedArrivalDate" TIMESTAMP(3),
    "readinessCorrectionDate" TIMESTAMP(3),
    "underdeliveryDate" TIMESTAMP(3),
    "readinessThrough" TEXT,
    "deliveryConditions" TEXT,
    "contractType" TEXT,
    "constructionObject" TEXT,
    "supplierOrgId" TEXT,
    "customerOrgId" TEXT,
    "warehouseId" TEXT,
    "requestId" TEXT,
    "approvalRouteId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_order_items" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION,
    "vatRate" DOUBLE PRECISION,
    "vatAmount" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "basis" TEXT,
    "nomenclatureId" TEXT,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "supplier_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_items" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "warehouseId" TEXT NOT NULL,
    "nomenclatureId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_movements" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "movementType" "WarehouseMovementType" NOT NULL,
    "status" "WarehouseMovStatus" NOT NULL DEFAULT 'DRAFT',
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "consignor" TEXT,
    "consignee" TEXT,
    "vatType" TEXT,
    "vatRate" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "currencyId" TEXT,
    "externalNumber" TEXT,
    "arrivalDate" TIMESTAMP(3),
    "attachmentS3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fromWarehouseId" TEXT,
    "toWarehouseId" TEXT,
    "orderId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_movement_lines" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "notes" TEXT,
    "vatAmount" DOUBLE PRECISION,
    "totalWithVat" DOUBLE PRECISION,
    "basis" TEXT,
    "gtd" TEXT,
    "country" TEXT,
    "comment" TEXT,
    "discount" DOUBLE PRECISION,
    "lineVatRate" DOUBLE PRECISION,
    "recipientAddress" TEXT,
    "movementId" TEXT NOT NULL,
    "nomenclatureId" TEXT,
    "materialBatchId" TEXT,

    CONSTRAINT "warehouse_movement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_journals" (
    "id" TEXT NOT NULL,
    "type" "SpecialJournalType" NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "JournalStatus" NOT NULL DEFAULT 'ACTIVE',
    "normativeRef" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "requisites" JSONB,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "contractId" TEXT,
    "responsibleId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publicShareToken" TEXT,
    "publicShareExpiresAt" TIMESTAMP(3),
    "publicShareViewCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "special_journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_journal_entries" (
    "id" TEXT NOT NULL,
    "entryNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT NOT NULL,
    "location" TEXT,
    "normativeRef" TEXT,
    "weather" TEXT,
    "temperature" INTEGER,
    "data" JSONB,
    "inspectionDate" TIMESTAMP(3),
    "inspectionNotificationSent" BOOLEAN NOT NULL DEFAULT false,
    "executionDocId" TEXT,
    "sectionId" TEXT,
    "journalId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "attachmentS3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_remarks" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "deadline" TIMESTAMP(3),
    "remediationDeadline" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "objectDescription" TEXT,
    "attachmentS3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "entryId" TEXT,
    "journalId" TEXT,
    "authorId" TEXT NOT NULL,
    "resolvedById" TEXT,
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entry_remarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_remark_replies" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "remarkId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_remark_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_sections" (
    "id" TEXT NOT NULL,
    "sectionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_links" (
    "id" TEXT NOT NULL,
    "linkType" "JournalLinkType" NOT NULL DEFAULT 'GENERIC',
    "sourceEntryId" TEXT NOT NULL,
    "targetEntryId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entry_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "id_closure_packages" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "executionDocIds" TEXT[],
    "registryIds" TEXT[],
    "archiveDocIds" TEXT[],
    "s3Key" TEXT,
    "fileName" TEXT,
    "exportedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "id_closure_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "comment" TEXT,
    "inspectorId" TEXT NOT NULL,
    "inspectorOrgId" TEXT,
    "responsibleId" TEXT,
    "responsibleOrgId" TEXT,
    "contractorPresent" BOOLEAN,
    "attentionUserId" TEXT,
    "ganttTaskIds" TEXT[],
    "attachmentS3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_acts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "s3Key" TEXT,
    "fileName" TEXT,
    "inspectionId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_acts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "PrescriptionType" NOT NULL,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "s3Key" TEXT,
    "fileName" TEXT,
    "inspectionId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "responsibleId" TEXT,
    "approvalRouteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_remediation_acts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "RemediationActStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "s3Key" TEXT,
    "fileName" TEXT,
    "inspectionId" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "defectIds" TEXT[],
    "remediationDetails" JSONB,
    "issuedById" TEXT NOT NULL,
    "approvalRouteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "defect_remediation_acts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_briefings" (
    "id" TEXT NOT NULL,
    "type" "SafetyBriefingType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "topic" TEXT NOT NULL,
    "notes" TEXT,
    "conductedById" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "participants" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_briefings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bim_sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bim_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bim_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "status" "BimModelStatus" NOT NULL DEFAULT 'PROCESSING',
    "stage" "BimModelStage",
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "sectionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "ifcVersion" TEXT,
    "elementCount" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bim_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bim_model_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "modelId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bim_model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bim_elements" (
    "id" TEXT NOT NULL,
    "ifcGuid" TEXT NOT NULL,
    "ifcType" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "layer" TEXT,
    "level" TEXT,
    "properties" JSONB,
    "modelId" TEXT NOT NULL,

    CONSTRAINT "bim_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bim_element_links" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bim_element_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bim_access" (
    "id" TEXT NOT NULL,
    "level" "BimAccessLevel" NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stage" "BimModelStage",
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bim_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "categoryId" TEXT,
    "templateId" TEXT,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "pdfS3Key" TEXT,
    "xlsxS3Key" TEXT,
    "fileName" TEXT,
    "approvalRouteId" TEXT,
    "s3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_blocks" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "ReportBlockType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "isAutoFilled" BOOLEAN NOT NULL DEFAULT false,
    "s3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reportId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "blockDefinitions" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thematic_report_configs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "availableColumns" JSONB NOT NULL,
    "defaultColumns" JSONB NOT NULL,
    "dataSource" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thematic_report_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_issues" (
    "id" TEXT NOT NULL,
    "type" "ProblemIssueType" NOT NULL,
    "status" "ProblemIssueStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "responsible" TEXT,
    "deadline" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "causes" TEXT,
    "measuresTaken" TEXT,
    "resolutionDate" TIMESTAMP(3),
    "assigneeOrgId" TEXT,
    "verifierOrgId" TEXT,
    "typeRefId" TEXT,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_issue_attachments" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issueId" TEXT NOT NULL,

    CONSTRAINT "problem_issue_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_plots" (
    "id" TEXT NOT NULL,
    "cadastralNumber" TEXT NOT NULL,
    "address" TEXT,
    "area" DOUBLE PRECISION,
    "landCategory" TEXT,
    "permittedUse" TEXT,
    "cadastralValue" DOUBLE PRECISION,
    "status" TEXT,
    "ownershipForm" TEXT,
    "hasEncumbrances" BOOLEAN NOT NULL DEFAULT false,
    "encumbranceInfo" TEXT,
    "hasRestrictions" BOOLEAN NOT NULL DEFAULT false,
    "restrictionInfo" TEXT,
    "hasDemolitionObjects" BOOLEAN NOT NULL DEFAULT false,
    "demolitionInfo" TEXT,
    "inspectionDate" TIMESTAMP(3),
    "egrnNumber" TEXT,
    "hasPlacementPossibility" BOOLEAN NOT NULL DEFAULT false,
    "placementInfo" TEXT,
    "surveyInfo" TEXT,
    "gpzuNumber" TEXT,
    "gpzuDate" TIMESTAMP(3),
    "gpzuS3Key" TEXT,
    "projectId" TEXT NOT NULL,
    "ownerOrgId" TEXT,
    "tenantOrgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_plots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_conditions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "connectionAvailability" TEXT,
    "issueDate" TIMESTAMP(3),
    "number" TEXT,
    "expirationDate" TIMESTAMP(3),
    "issuingAuthority" TEXT,
    "connectionConditions" TEXT,
    "projectId" TEXT NOT NULL,
    "responsibleOrgId" TEXT,
    "landPlotId" TEXT,
    "documentS3Key" TEXT,
    "documentFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technical_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding_records" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "recordType" "FundingRecordType" NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "federalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "regionalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "localBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ownFunds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extraBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funding_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limit_risks" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT '╨Р╨║╤В╨╕╨▓╨╜╨╛',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "federalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "regionalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "localBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extraBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ownFunds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskReason" TEXT NOT NULL,
    "resolutionProposal" TEXT,
    "completionDate" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "contractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "limit_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_cameras" (
    "id" TEXT NOT NULL,
    "cameraNumber" TEXT,
    "locationName" TEXT,
    "operationalStatus" TEXT NOT NULL DEFAULT '╨а╨░╨▒╨╛╤В╨░╨╡╤В',
    "cameraModel" TEXT,
    "rtspUrl" TEXT,
    "httpUrl" TEXT NOT NULL,
    "failureReason" TEXT,
    "s3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fileNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_cameras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_coordinates" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "constructionPhase" INTEGER,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_coordinates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_indicators" (
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "indicatorName" TEXT NOT NULL,
    "value" TEXT,
    "comment" TEXT,
    "maxValue" TEXT,
    "sourceType" "IndicatorSource" NOT NULL DEFAULT 'MANUAL',
    "autoSourceField" TEXT,
    "fileKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "object_organizations" (
    "id" TEXT NOT NULL,
    "buildingObjectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "object_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "object_persons" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "organizationId" TEXT,
    "linkedUserId" TEXT,
    "buildingObjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "object_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "object_participant_roles" (
    "id" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "orgParticipantId" TEXT,
    "personId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "object_participant_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_appointments" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "documentType" "AppointmentDocType" NOT NULL,
    "documentNumber" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "s3Key" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sed_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_document_folders" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sed_document_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_regulations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "stepsTemplate" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_regulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_workflows" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "workflowType" "WorkflowType" NOT NULL,
    "status" "SEDWorkflowStatus" NOT NULL DEFAULT 'CREATED',
    "documentId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "participants" TEXT[],
    "observers" TEXT[],
    "approvalRouteId" TEXT,
    "regulationId" TEXT,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sed_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_workflow_messages" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sed_workflow_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_links" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sed_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sed_document_bases" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "basisWorkflowId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sed_document_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_documents" (
    "id" TEXT NOT NULL,
    "number" TEXT,
    "date" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT '╨Т ╤А╨░╨▒╨╛╤В╨╡',
    "version" INTEGER NOT NULL DEFAULT 1,
    "activeIssuesCount" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pir_object_type_configs" (
    "id" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pir_object_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pir_category_configs" (
    "id" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "parentCode" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "configId" TEXT NOT NULL,

    CONSTRAINT "pir_category_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "id_doc_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "projectId" TEXT,
    "organizationId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "id_doc_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_field_values" (
    "id" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_normative_refs" (
    "id" TEXT NOT NULL,
    "defectId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_normative_refs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_roles" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TaskRoleType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "visibility" "TaskGroupVisibility" NOT NULL DEFAULT 'EVERYONE',
    "visibleUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_labels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "groupId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_label_on_task" (
    "taskId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "task_label_on_task_pkey" PRIMARY KEY ("taskId","labelId")
);

-- CreateTable
CREATE TABLE "task_types" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,

    CONSTRAINT "task_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "typeId" TEXT,
    "groupId" TEXT,
    "parentTemplateId" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "duration" INTEGER,
    "s3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schedules" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "repeatType" "TaskScheduleRepeat" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "weekDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "monthDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createSubTasks" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_checklist_items" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "s3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_reports" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "progress" TEXT NOT NULL,
    "newDeadline" TIMESTAMP(3),
    "s3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "s3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_audits" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "ReferenceAuditAction" NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reference_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "shortSymbol" TEXT NOT NULL,
    "fullName" TEXT,
    "englishName" TEXT,
    "caseForm" TEXT,
    "code" TEXT NOT NULL,
    "numericCode" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_units_ref" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "ruCode" TEXT,
    "intCode" TEXT,
    "category" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "measurement_units_ref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "declension_cases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "declension_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_kinds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "shortName" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_kinds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types_ref" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "module" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_types_ref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_expense_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_expense_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_types_ref" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_types_ref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_categories_ref" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "requiresSuspension" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "defect_categories_ref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_issue_types_ref" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_issue_types_ref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "signupCount" INTEGER NOT NULL DEFAULT 0,
    "paidCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "referrerRole" "ProfessionalRole",
    "referredRole" "ProfessionalRole",
    "isCrossRole" BOOLEAN NOT NULL DEFAULT false,
    "signupAt" TIMESTAMP(3),
    "firstPaidAt" TIMESTAMP(3),
    "firstPaymentAmountRub" INTEGER,
    "firstPaymentId" TEXT,
    "rewardType" "RewardType",
    "rewardAmountRub" INTEGER NOT NULL DEFAULT 0,
    "rewardStatus" "RewardStatus" NOT NULL DEFAULT 'PENDING',
    "rewardGrantedAt" TIMESTAMP(3),
    "discountAmountRub" INTEGER NOT NULL DEFAULT 0,
    "discountApplied" BOOLEAN NOT NULL DEFAULT false,
    "clickIp" TEXT,
    "clickUserAgent" TEXT,
    "signupIp" TEXT,
    "suspicious" BOOLEAN NOT NULL DEFAULT false,
    "fraudReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_credits" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "balanceRub" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger_entries" (
    "id" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "amountRub" INTEGER NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "description" TEXT NOT NULL,
    "referralId" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dhKey" TEXT NOT NULL,
    "authKey" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'YOOKASSA',
    "providerMethodId" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "cardExpiryMonth" INTEGER,
    "cardExpiryYear" INTEGER,
    "accountTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMP(3),
    "deactivationReason" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "successfulChargesCount" INTEGER NOT NULL DEFAULT 0,
    "failedChargesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_events" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "type" "SubscriptionEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "type" "ReceiptType" NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerInn" TEXT,
    "items" JSONB NOT NULL,
    "totalRub" INTEGER NOT NULL,
    "vatRub" INTEGER NOT NULL DEFAULT 0,
    "provider" "ReceiptProvider" NOT NULL DEFAULT 'YOOKASSA',
    "providerReceiptId" TEXT,
    "ofdUrl" TEXT,
    "ofdPdfUrl" TEXT,
    "status" "ReceiptStatus" NOT NULL,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,
    "fiscalDocumentNumber" TEXT,
    "fiscalDocumentAttribute" TEXT,
    "fiscalDriveNumber" TEXT,
    "registeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingPeriod" "BillingPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "seatsCount" INTEGER NOT NULL DEFAULT 1,
    "subtotalRub" INTEGER NOT NULL,
    "vatRub" INTEGER NOT NULL DEFAULT 0,
    "totalRub" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "pdfUrl" TEXT,
    "contractPdfUrl" TEXT,
    "actPdfUrl" TEXT,
    "status" "InvoiceStatus" NOT NULL,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "subscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "maxDiscountRub" INTEGER,
    "applicableToCategories" "PlanCategory"[],
    "isFirstPaymentOnly" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "maxTotalRedemptions" INTEGER,
    "maxPerUser" INTEGER NOT NULL DEFAULT 1,
    "redemptionsCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_code_rules" (
    "promoCodeId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "promo_code_rules_pkey" PRIMARY KEY ("promoCodeId","planId")
);

-- CreateTable
CREATE TABLE "promo_code_redemptions" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT,
    "discountAppliedRub" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_code_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dunning_attempts" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "paymentId" TEXT,
    "result" "DunningResult",
    "failureReason" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "userResponseAction" "UserDunningAction",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dunning_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercent" INTEGER NOT NULL DEFAULT 0,
    "audiences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "subscription_plans_category_profiRole_idx" ON "subscription_plans"("category", "profiRole");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_features_code_key" ON "subscription_features"("code");

-- CreateIndex
CREATE INDEX "plan_features_featureId_idx" ON "plan_features"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_features_planId_featureId_key" ON "plan_features"("planId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_yookassaSubscriptionId_key" ON "subscriptions"("yookassaSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_workspaceId_status_idx" ON "subscriptions"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "subscriptions_status_currentPeriodEnd_idx" ON "subscriptions"("status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "subscriptions_status_graceUntil_idx" ON "subscriptions"("status", "graceUntil");

-- CreateIndex
CREATE INDEX "subscriptions_status_nextDunningAt_idx" ON "subscriptions"("status", "nextDunningAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_yookassaPaymentId_key" ON "payments"("yookassaPaymentId");

-- CreateIndex
CREATE INDEX "payments_workspaceId_createdAt_idx" ON "payments"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "payments_subscriptionId_idx" ON "payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payments_yookassaPaymentId_idx" ON "payments"("yookassaPaymentId");

-- CreateIndex
CREATE INDEX "payments_providerPaymentId_idx" ON "payments"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_inn_key" ON "organizations"("inn");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_ogrn_key" ON "organizations"("ogrn");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_organizationId_key" ON "workspaces"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_activeSubscriptionId_key" ON "workspaces"("activeSubscriptionId");

-- CreateIndex
CREATE INDEX "workspace_members_userId_status_idx" ON "workspace_members"("userId", "status");

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_role_idx" ON "workspace_members"("workspaceId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspaceId_userId_key" ON "workspace_members"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "project_members_projectId_idx" ON "project_members"("projectId");

-- CreateIndex
CREATE INDEX "project_members_workspaceMemberId_idx" ON "project_members"("workspaceMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_projectId_workspaceMemberId_key" ON "project_members"("projectId", "workspaceMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "users_referredByCode_idx" ON "users"("referredByCode");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_organizationId_idx" ON "invitations"("organizationId");

-- CreateIndex
CREATE INDEX "invitations_invitedById_idx" ON "invitations"("invitedById");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token_key" ON "workspace_invitations"("token");

-- CreateIndex
CREATE INDEX "workspace_invitations_workspaceId_status_idx" ON "workspace_invitations"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "workspace_invitations_email_idx" ON "workspace_invitations"("email");

-- CreateIndex
CREATE INDEX "building_objects_organizationId_idx" ON "building_objects"("organizationId");

-- CreateIndex
CREATE INDEX "building_objects_parentId_idx" ON "building_objects"("parentId");

-- CreateIndex
CREATE INDEX "building_objects_region_idx" ON "building_objects"("region");

-- CreateIndex
CREATE INDEX "building_objects_workspaceId_idx" ON "building_objects"("workspaceId");

-- CreateIndex
CREATE INDEX "contracts_projectId_idx" ON "contracts"("projectId");

-- CreateIndex
CREATE INDEX "contracts_parentId_idx" ON "contracts"("parentId");

-- CreateIndex
CREATE INDEX "contracts_parentContractId_idx" ON "contracts"("parentContractId");

-- CreateIndex
CREATE INDEX "contracts_contractKindId_idx" ON "contracts"("contractKindId");

-- CreateIndex
CREATE INDEX "contract_participants_contractId_idx" ON "contract_participants"("contractId");

-- CreateIndex
CREATE INDEX "contract_participants_organizationId_idx" ON "contract_participants"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_participants_contractId_organizationId_role_key" ON "contract_participants"("contractId", "organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ksi_nodes_code_key" ON "ksi_nodes"("code");

-- CreateIndex
CREATE INDEX "ksi_nodes_tableCode_idx" ON "ksi_nodes"("tableCode");

-- CreateIndex
CREATE INDEX "ksi_nodes_parentId_idx" ON "ksi_nodes"("parentId");

-- CreateIndex
CREATE INDEX "work_items_contractId_idx" ON "work_items"("contractId");

-- CreateIndex
CREATE INDEX "work_items_ksiNodeId_idx" ON "work_items"("ksiNodeId");

-- CreateIndex
CREATE INDEX "materials_contractId_idx" ON "materials"("contractId");

-- CreateIndex
CREATE INDEX "materials_workItemId_idx" ON "materials"("workItemId");

-- CreateIndex
CREATE INDEX "material_documents_materialId_idx" ON "material_documents"("materialId");

-- CreateIndex
CREATE INDEX "material_batches_materialId_idx" ON "material_batches"("materialId");

-- CreateIndex
CREATE INDEX "input_control_records_batchId_idx" ON "input_control_records"("batchId");

-- CreateIndex
CREATE INDEX "input_control_records_inspectorId_idx" ON "input_control_records"("inspectorId");

-- CreateIndex
CREATE INDEX "input_control_acts_recordId_idx" ON "input_control_acts"("recordId");

-- CreateIndex
CREATE INDEX "work_records_contractId_idx" ON "work_records"("contractId");

-- CreateIndex
CREATE INDEX "work_records_workItemId_idx" ON "work_records"("workItemId");

-- CreateIndex
CREATE INDEX "work_records_date_idx" ON "work_records"("date");

-- CreateIndex
CREATE INDEX "material_writeoffs_workRecordId_idx" ON "material_writeoffs"("workRecordId");

-- CreateIndex
CREATE INDEX "material_writeoffs_materialId_idx" ON "material_writeoffs"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "material_writeoffs_workRecordId_materialId_key" ON "material_writeoffs"("workRecordId", "materialId");

-- CreateIndex
CREATE INDEX "photos_entityType_entityId_idx" ON "photos"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "photos_authorId_idx" ON "photos"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "execution_docs_qrToken_key" ON "execution_docs"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "execution_docs_publicShareToken_key" ON "execution_docs"("publicShareToken");

-- CreateIndex
CREATE INDEX "execution_docs_contractId_idx" ON "execution_docs"("contractId");

-- CreateIndex
CREATE INDEX "execution_docs_workRecordId_idx" ON "execution_docs"("workRecordId");

-- CreateIndex
CREATE INDEX "execution_docs_createdById_idx" ON "execution_docs"("createdById");

-- CreateIndex
CREATE INDEX "execution_docs_lastEditedById_idx" ON "execution_docs"("lastEditedById");

-- CreateIndex
CREATE INDEX "execution_docs_status_idx" ON "execution_docs"("status");

-- CreateIndex
CREATE INDEX "execution_docs_categoryId_idx" ON "execution_docs"("categoryId");

-- CreateIndex
CREATE INDEX "execution_docs_publicShareToken_idx" ON "execution_docs"("publicShareToken");

-- CreateIndex
CREATE INDEX "execution_doc_links_sourceDocId_idx" ON "execution_doc_links"("sourceDocId");

-- CreateIndex
CREATE INDEX "execution_doc_links_targetDocId_idx" ON "execution_doc_links"("targetDocId");

-- CreateIndex
CREATE UNIQUE INDEX "execution_doc_links_sourceDocId_targetDocId_key" ON "execution_doc_links"("sourceDocId", "targetDocId");

-- CreateIndex
CREATE UNIQUE INDEX "signing_routes_executionDocId_key" ON "signing_routes"("executionDocId");

-- CreateIndex
CREATE INDEX "signing_steps_routeId_idx" ON "signing_steps"("routeId");

-- CreateIndex
CREATE INDEX "signing_steps_userId_idx" ON "signing_steps"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ks_act_form_data_executionDocId_key" ON "ks_act_form_data"("executionDocId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_routes_executionDocId_key" ON "approval_routes"("executionDocId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_routes_specialJournalId_key" ON "approval_routes"("specialJournalId");

-- CreateIndex
CREATE INDEX "approval_steps_routeId_idx" ON "approval_steps"("routeId");

-- CreateIndex
CREATE INDEX "approval_steps_userId_idx" ON "approval_steps"("userId");

-- CreateIndex
CREATE INDEX "signatures_userId_idx" ON "signatures"("userId");

-- CreateIndex
CREATE INDEX "signatures_executionDocId_idx" ON "signatures"("executionDocId");

-- CreateIndex
CREATE UNIQUE INDEX "signatures_executionDocId_userId_key" ON "signatures"("executionDocId", "userId");

-- CreateIndex
CREATE INDEX "doc_comments_executionDocId_idx" ON "doc_comments"("executionDocId");

-- CreateIndex
CREATE INDEX "doc_comments_authorId_idx" ON "doc_comments"("authorId");

-- CreateIndex
CREATE INDEX "doc_comments_resolvedById_idx" ON "doc_comments"("resolvedById");

-- CreateIndex
CREATE INDEX "doc_comments_responsibleId_idx" ON "doc_comments"("responsibleId");

-- CreateIndex
CREATE INDEX "doc_comment_replies_commentId_idx" ON "doc_comment_replies"("commentId");

-- CreateIndex
CREATE INDEX "doc_comment_replies_authorId_idx" ON "doc_comment_replies"("authorId");

-- CreateIndex
CREATE INDEX "archive_documents_contractId_idx" ON "archive_documents"("contractId");

-- CreateIndex
CREATE INDEX "archive_documents_uploadedById_idx" ON "archive_documents"("uploadedById");

-- CreateIndex
CREATE INDEX "ks2_acts_contractId_idx" ON "ks2_acts"("contractId");

-- CreateIndex
CREATE INDEX "ks2_acts_createdById_idx" ON "ks2_acts"("createdById");

-- CreateIndex
CREATE INDEX "ks2_acts_categoryId_idx" ON "ks2_acts"("categoryId");

-- CreateIndex
CREATE INDEX "ks2_acts_correctionToKs2Id_idx" ON "ks2_acts"("correctionToKs2Id");

-- CreateIndex
CREATE INDEX "ks2_items_ks2ActId_idx" ON "ks2_items"("ks2ActId");

-- CreateIndex
CREATE INDEX "ks2_items_workItemId_idx" ON "ks2_items"("workItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ks3_certificates_ks2ActId_key" ON "ks3_certificates"("ks2ActId");

-- CreateIndex
CREATE INDEX "ks3_certificates_contractId_idx" ON "ks3_certificates"("contractId");

-- CreateIndex
CREATE INDEX "id_registries_contractId_idx" ON "id_registries"("contractId");

-- CreateIndex
CREATE INDEX "estimate_imports_contractId_idx" ON "estimate_imports"("contractId");

-- CreateIndex
CREATE INDEX "estimate_imports_createdById_idx" ON "estimate_imports"("createdById");

-- CreateIndex
CREATE INDEX "estimate_import_items_importId_idx" ON "estimate_import_items"("importId");

-- CreateIndex
CREATE INDEX "estimate_import_items_suggestedKsiNodeId_idx" ON "estimate_import_items"("suggestedKsiNodeId");

-- CreateIndex
CREATE INDEX "estimate_import_items_workItemId_idx" ON "estimate_import_items"("workItemId");

-- CreateIndex
CREATE INDEX "estimate_import_items_parentItemId_idx" ON "estimate_import_items"("parentItemId");

-- CreateIndex
CREATE INDEX "document_templates_category_idx" ON "document_templates"("category");

-- CreateIndex
CREATE INDEX "document_templates_organizationId_idx" ON "document_templates"("organizationId");

-- CreateIndex
CREATE INDEX "activity_logs_organizationId_createdAt_idx" ON "activity_logs"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "gantt_versions_contractId_idx" ON "gantt_versions"("contractId");

-- CreateIndex
CREATE INDEX "gantt_versions_contractId_isActive_idx" ON "gantt_versions"("contractId", "isActive");

-- CreateIndex
CREATE INDEX "gantt_versions_projectId_idx" ON "gantt_versions"("projectId");

-- CreateIndex
CREATE INDEX "gantt_versions_delegatedFromOrgId_idx" ON "gantt_versions"("delegatedFromOrgId");

-- CreateIndex
CREATE INDEX "gantt_versions_delegatedToOrgId_idx" ON "gantt_versions"("delegatedToOrgId");

-- CreateIndex
CREATE INDEX "gantt_versions_delegatedFromVersionId_idx" ON "gantt_versions"("delegatedFromVersionId");

-- CreateIndex
CREATE INDEX "gantt_tasks_contractId_idx" ON "gantt_tasks"("contractId");

-- CreateIndex
CREATE INDEX "gantt_tasks_versionId_idx" ON "gantt_tasks"("versionId");

-- CreateIndex
CREATE INDEX "gantt_tasks_versionId_sortOrder_idx" ON "gantt_tasks"("versionId", "sortOrder");

-- CreateIndex
CREATE INDEX "gantt_tasks_parentId_idx" ON "gantt_tasks"("parentId");

-- CreateIndex
CREATE INDEX "gantt_tasks_workItemId_idx" ON "gantt_tasks"("workItemId");

-- CreateIndex
CREATE INDEX "gantt_tasks_estimateItemId_idx" ON "gantt_tasks"("estimateItemId");

-- CreateIndex
CREATE INDEX "gantt_tasks_taskContractId_idx" ON "gantt_tasks"("taskContractId");

-- CreateIndex
CREATE INDEX "gantt_tasks_sourceTaskId_idx" ON "gantt_tasks"("sourceTaskId");

-- CreateIndex
CREATE INDEX "gantt_task_exec_docs_execDocId_idx" ON "gantt_task_exec_docs"("execDocId");

-- CreateIndex
CREATE INDEX "gantt_dependencies_predecessorId_idx" ON "gantt_dependencies"("predecessorId");

-- CreateIndex
CREATE INDEX "gantt_dependencies_successorId_idx" ON "gantt_dependencies"("successorId");

-- CreateIndex
CREATE UNIQUE INDEX "gantt_dependencies_predecessorId_successorId_key" ON "gantt_dependencies"("predecessorId", "successorId");

-- CreateIndex
CREATE INDEX "gantt_stages_projectId_idx" ON "gantt_stages"("projectId");

-- CreateIndex
CREATE INDEX "gantt_daily_plans_taskId_idx" ON "gantt_daily_plans"("taskId");

-- CreateIndex
CREATE INDEX "gantt_daily_plans_planDate_idx" ON "gantt_daily_plans"("planDate");

-- CreateIndex
CREATE INDEX "gantt_calendars_versionId_idx" ON "gantt_calendars"("versionId");

-- CreateIndex
CREATE INDEX "gantt_calendars_taskId_idx" ON "gantt_calendars"("taskId");

-- CreateIndex
CREATE INDEX "gantt_calendars_projectId_idx" ON "gantt_calendars"("projectId");

-- CreateIndex
CREATE INDEX "gantt_change_logs_versionId_idx" ON "gantt_change_logs"("versionId");

-- CreateIndex
CREATE INDEX "gantt_change_logs_userId_idx" ON "gantt_change_logs"("userId");

-- CreateIndex
CREATE INDEX "defects_projectId_idx" ON "defects"("projectId");

-- CreateIndex
CREATE INDEX "defects_projectId_status_idx" ON "defects"("projectId", "status");

-- CreateIndex
CREATE INDEX "defects_contractId_idx" ON "defects"("contractId");

-- CreateIndex
CREATE INDEX "defects_authorId_idx" ON "defects"("authorId");

-- CreateIndex
CREATE INDEX "defects_assigneeId_idx" ON "defects"("assigneeId");

-- CreateIndex
CREATE INDEX "defects_deadline_idx" ON "defects"("deadline");

-- CreateIndex
CREATE INDEX "defects_inspectionId_idx" ON "defects"("inspectionId");

-- CreateIndex
CREATE INDEX "defects_categoryRefId_idx" ON "defects"("categoryRefId");

-- CreateIndex
CREATE INDEX "defect_templates_organizationId_idx" ON "defect_templates"("organizationId");

-- CreateIndex
CREATE INDEX "defect_templates_isSystem_idx" ON "defect_templates"("isSystem");

-- CreateIndex
CREATE INDEX "defect_comments_defectId_idx" ON "defect_comments"("defectId");

-- CreateIndex
CREATE INDEX "defect_comments_authorId_idx" ON "defect_comments"("authorId");

-- CreateIndex
CREATE INDEX "defect_annotations_defectId_idx" ON "defect_annotations"("defectId");

-- CreateIndex
CREATE INDEX "dashboard_widgets_userId_idx" ON "dashboard_widgets"("userId");

-- CreateIndex
CREATE INDEX "daily_logs_contractId_idx" ON "daily_logs"("contractId");

-- CreateIndex
CREATE INDEX "daily_logs_date_idx" ON "daily_logs"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_contractId_date_key" ON "daily_logs"("contractId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "project_portal_tokens_token_key" ON "project_portal_tokens"("token");

-- CreateIndex
CREATE INDEX "project_portal_tokens_projectId_idx" ON "project_portal_tokens"("projectId");

-- CreateIndex
CREATE INDEX "change_orders_contractId_idx" ON "change_orders"("contractId");

-- CreateIndex
CREATE INDEX "funding_sources_projectId_idx" ON "funding_sources"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_publicLinkToken_key" ON "tasks"("publicLinkToken");

-- CreateIndex
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_idx" ON "tasks"("assigneeId");

-- CreateIndex
CREATE INDEX "tasks_parentTaskId_idx" ON "tasks"("parentTaskId");

-- CreateIndex
CREATE INDEX "tasks_versionId_idx" ON "tasks"("versionId");

-- CreateIndex
CREATE INDEX "tasks_typeId_idx" ON "tasks"("typeId");

-- CreateIndex
CREATE INDEX "tasks_groupId_idx" ON "tasks"("groupId");

-- CreateIndex
CREATE INDEX "tasks_templateId_idx" ON "tasks"("templateId");

-- CreateIndex
CREATE INDEX "project_management_versions_projectId_idx" ON "project_management_versions"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "correspondences_approvalRouteId_key" ON "correspondences"("approvalRouteId");

-- CreateIndex
CREATE INDEX "correspondences_projectId_idx" ON "correspondences"("projectId");

-- CreateIndex
CREATE INDEX "correspondences_direction_idx" ON "correspondences"("direction");

-- CreateIndex
CREATE INDEX "correspondences_status_idx" ON "correspondences"("status");

-- CreateIndex
CREATE INDEX "correspondence_attachments_correspondenceId_idx" ON "correspondence_attachments"("correspondenceId");

-- CreateIndex
CREATE INDEX "rfis_projectId_idx" ON "rfis"("projectId");

-- CreateIndex
CREATE INDEX "rfis_assigneeId_idx" ON "rfis"("assigneeId");

-- CreateIndex
CREATE INDEX "rfis_status_idx" ON "rfis"("status");

-- CreateIndex
CREATE INDEX "rfi_attachments_rfiId_idx" ON "rfi_attachments"("rfiId");

-- CreateIndex
CREATE UNIQUE INDEX "sed_documents_approvalRouteId_key" ON "sed_documents"("approvalRouteId");

-- CreateIndex
CREATE INDEX "sed_documents_projectId_idx" ON "sed_documents"("projectId");

-- CreateIndex
CREATE INDEX "sed_documents_status_idx" ON "sed_documents"("status");

-- CreateIndex
CREATE INDEX "sed_documents_docType_idx" ON "sed_documents"("docType");

-- CreateIndex
CREATE INDEX "sed_attachments_sedDocId_idx" ON "sed_attachments"("sedDocId");

-- CreateIndex
CREATE INDEX "chat_messages_projectId_createdAt_idx" ON "chat_messages"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_contractId_createdAt_idx" ON "chat_messages"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "contract_categories_organizationId_idx" ON "contract_categories"("organizationId");

-- CreateIndex
CREATE INDEX "contract_payments_contractId_idx" ON "contract_payments"("contractId");

-- CreateIndex
CREATE INDEX "contract_payments_paymentDate_idx" ON "contract_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "contract_obligations_contractId_idx" ON "contract_obligations"("contractId");

-- CreateIndex
CREATE INDEX "contract_advances_contractId_idx" ON "contract_advances"("contractId");

-- CreateIndex
CREATE INDEX "contract_executions_contractId_idx" ON "contract_executions"("contractId");

-- CreateIndex
CREATE INDEX "contract_guarantees_contractId_idx" ON "contract_guarantees"("contractId");

-- CreateIndex
CREATE INDEX "contract_detail_infos_contractId_idx" ON "contract_detail_infos"("contractId");

-- CreateIndex
CREATE INDEX "contract_financial_tables_contractId_idx" ON "contract_financial_tables"("contractId");

-- CreateIndex
CREATE INDEX "contract_doc_links_contractId_idx" ON "contract_doc_links"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_doc_links_contractId_documentId_linkType_key" ON "contract_doc_links"("contractId", "documentId", "linkType");

-- CreateIndex
CREATE INDEX "project_folders_projectId_idx" ON "project_folders"("projectId");

-- CreateIndex
CREATE INDEX "project_folders_parentId_idx" ON "project_folders"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "project_documents_qrToken_key" ON "project_documents"("qrToken");

-- CreateIndex
CREATE INDEX "project_documents_folderId_idx" ON "project_documents"("folderId");

-- CreateIndex
CREATE INDEX "project_documents_qrToken_idx" ON "project_documents"("qrToken");

-- CreateIndex
CREATE INDEX "project_document_versions_documentId_idx" ON "project_document_versions"("documentId");

-- CreateIndex
CREATE INDEX "project_events_projectId_idx" ON "project_events"("projectId");

-- CreateIndex
CREATE INDEX "project_events_scheduledAt_idx" ON "project_events"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "design_tasks_approvalRouteId_key" ON "design_tasks"("approvalRouteId");

-- CreateIndex
CREATE INDEX "design_tasks_projectId_idx" ON "design_tasks"("projectId");

-- CreateIndex
CREATE INDEX "design_tasks_taskType_idx" ON "design_tasks"("taskType");

-- CreateIndex
CREATE INDEX "design_task_params_taskId_idx" ON "design_task_params"("taskId");

-- CreateIndex
CREATE INDEX "design_task_comments_taskId_idx" ON "design_task_comments"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "design_documents_qrToken_key" ON "design_documents"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "design_documents_approvalRouteId_key" ON "design_documents"("approvalRouteId");

-- CreateIndex
CREATE INDEX "design_documents_projectId_idx" ON "design_documents"("projectId");

-- CreateIndex
CREATE INDEX "design_documents_docType_idx" ON "design_documents"("docType");

-- CreateIndex
CREATE INDEX "design_documents_status_idx" ON "design_documents"("status");

-- CreateIndex
CREATE INDEX "design_documents_qrToken_idx" ON "design_documents"("qrToken");

-- CreateIndex
CREATE INDEX "design_doc_comments_docId_idx" ON "design_doc_comments"("docId");

-- CreateIndex
CREATE INDEX "pir_registries_projectId_idx" ON "pir_registries"("projectId");

-- CreateIndex
CREATE INDEX "pir_registry_items_registryId_idx" ON "pir_registry_items"("registryId");

-- CreateIndex
CREATE UNIQUE INDEX "pir_closure_acts_approvalRouteId_key" ON "pir_closure_acts"("approvalRouteId");

-- CreateIndex
CREATE INDEX "pir_closure_acts_projectId_idx" ON "pir_closure_acts"("projectId");

-- CreateIndex
CREATE INDEX "pir_closure_items_actId_idx" ON "pir_closure_items"("actId");

-- CreateIndex
CREATE INDEX "approval_templates_organizationId_entityType_idx" ON "approval_templates"("organizationId", "entityType");

-- CreateIndex
CREATE INDEX "approval_template_levels_templateId_idx" ON "approval_template_levels"("templateId");

-- CreateIndex
CREATE INDEX "design_doc_changes_docId_idx" ON "design_doc_changes"("docId");

-- CreateIndex
CREATE INDEX "pdf_stamps_entityType_entityId_idx" ON "pdf_stamps"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "stamp_titles_organizationId_idx" ON "stamp_titles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "estimate_versions_publicShareToken_key" ON "estimate_versions"("publicShareToken");

-- CreateIndex
CREATE INDEX "estimate_versions_contractId_idx" ON "estimate_versions"("contractId");

-- CreateIndex
CREATE INDEX "estimate_versions_parentVersionId_idx" ON "estimate_versions"("parentVersionId");

-- CreateIndex
CREATE INDEX "estimate_versions_categoryId_idx" ON "estimate_versions"("categoryId");

-- CreateIndex
CREATE INDEX "estimate_versions_publicShareToken_idx" ON "estimate_versions"("publicShareToken");

-- CreateIndex
CREATE INDEX "estimate_chapters_versionId_idx" ON "estimate_chapters"("versionId");

-- CreateIndex
CREATE INDEX "estimate_chapters_parentId_idx" ON "estimate_chapters"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "estimate_items_importItemId_key" ON "estimate_items"("importItemId");

-- CreateIndex
CREATE INDEX "estimate_items_chapterId_idx" ON "estimate_items"("chapterId");

-- CreateIndex
CREATE INDEX "estimate_items_ksiNodeId_idx" ON "estimate_items"("ksiNodeId");

-- CreateIndex
CREATE INDEX "estimate_items_workItemId_idx" ON "estimate_items"("workItemId");

-- CreateIndex
CREATE INDEX "estimate_change_logs_versionId_createdAt_idx" ON "estimate_change_logs"("versionId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "estimate_change_logs_userId_idx" ON "estimate_change_logs"("userId");

-- CreateIndex
CREATE INDEX "estimate_contracts_contractId_idx" ON "estimate_contracts"("contractId");

-- CreateIndex
CREATE INDEX "estimate_contract_versions_estimateContractId_idx" ON "estimate_contract_versions"("estimateContractId");

-- CreateIndex
CREATE INDEX "estimate_contract_versions_estimateVersionId_idx" ON "estimate_contract_versions"("estimateVersionId");

-- CreateIndex
CREATE INDEX "estimate_categories_projectId_idx" ON "estimate_categories"("projectId");

-- CreateIndex
CREATE INDEX "estimate_categories_parentId_idx" ON "estimate_categories"("parentId");

-- CreateIndex
CREATE INDEX "estimate_additional_costs_versionId_idx" ON "estimate_additional_costs"("versionId");

-- CreateIndex
CREATE INDEX "estimate_additional_costs_projectId_idx" ON "estimate_additional_costs"("projectId");

-- CreateIndex
CREATE INDEX "estimate_additional_cost_chapters_additionalCostId_idx" ON "estimate_additional_cost_chapters"("additionalCostId");

-- CreateIndex
CREATE INDEX "estimate_additional_cost_estimates_additionalCostId_idx" ON "estimate_additional_cost_estimates"("additionalCostId");

-- CreateIndex
CREATE INDEX "estimate_additional_cost_estimates_versionId_idx" ON "estimate_additional_cost_estimates"("versionId");

-- CreateIndex
CREATE INDEX "estimate_coefficients_versionId_idx" ON "estimate_coefficients"("versionId");

-- CreateIndex
CREATE INDEX "material_nomenclature_organizationId_idx" ON "material_nomenclature"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "material_requests_approvalRouteId_key" ON "material_requests"("approvalRouteId");

-- CreateIndex
CREATE INDEX "material_requests_projectId_idx" ON "material_requests"("projectId");

-- CreateIndex
CREATE INDEX "material_request_items_requestId_idx" ON "material_request_items"("requestId");

-- CreateIndex
CREATE INDEX "material_request_items_nomenclatureId_idx" ON "material_request_items"("nomenclatureId");

-- CreateIndex
CREATE INDEX "material_request_comments_requestId_idx" ON "material_request_comments"("requestId");

-- CreateIndex
CREATE INDEX "material_request_item_statuses_organizationId_idx" ON "material_request_item_statuses"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_orders_approvalRouteId_key" ON "supplier_orders"("approvalRouteId");

-- CreateIndex
CREATE INDEX "supplier_orders_projectId_idx" ON "supplier_orders"("projectId");

-- CreateIndex
CREATE INDEX "supplier_orders_requestId_idx" ON "supplier_orders"("requestId");

-- CreateIndex
CREATE INDEX "supplier_orders_type_idx" ON "supplier_orders"("type");

-- CreateIndex
CREATE INDEX "supplier_orders_approvalRouteId_idx" ON "supplier_orders"("approvalRouteId");

-- CreateIndex
CREATE INDEX "supplier_order_items_orderId_idx" ON "supplier_order_items"("orderId");

-- CreateIndex
CREATE INDEX "warehouses_projectId_idx" ON "warehouses"("projectId");

-- CreateIndex
CREATE INDEX "warehouse_items_warehouseId_idx" ON "warehouse_items"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_items_warehouseId_nomenclatureId_key" ON "warehouse_items"("warehouseId", "nomenclatureId");

-- CreateIndex
CREATE INDEX "warehouse_movements_projectId_idx" ON "warehouse_movements"("projectId");

-- CreateIndex
CREATE INDEX "warehouse_movements_movementType_idx" ON "warehouse_movements"("movementType");

-- CreateIndex
CREATE INDEX "warehouse_movement_lines_movementId_idx" ON "warehouse_movement_lines"("movementId");

-- CreateIndex
CREATE UNIQUE INDEX "special_journals_publicShareToken_key" ON "special_journals"("publicShareToken");

-- CreateIndex
CREATE INDEX "special_journals_projectId_idx" ON "special_journals"("projectId");

-- CreateIndex
CREATE INDEX "special_journals_projectId_type_idx" ON "special_journals"("projectId", "type");

-- CreateIndex
CREATE INDEX "special_journals_contractId_idx" ON "special_journals"("contractId");

-- CreateIndex
CREATE INDEX "special_journals_status_idx" ON "special_journals"("status");

-- CreateIndex
CREATE INDEX "special_journals_publicShareToken_idx" ON "special_journals"("publicShareToken");

-- CreateIndex
CREATE INDEX "special_journal_entries_journalId_date_idx" ON "special_journal_entries"("journalId", "date");

-- CreateIndex
CREATE INDEX "special_journal_entries_journalId_status_idx" ON "special_journal_entries"("journalId", "status");

-- CreateIndex
CREATE INDEX "special_journal_entries_inspectionDate_idx" ON "special_journal_entries"("inspectionDate");

-- CreateIndex
CREATE UNIQUE INDEX "special_journal_entries_journalId_entryNumber_key" ON "special_journal_entries"("journalId", "entryNumber");

-- CreateIndex
CREATE INDEX "journal_entry_remarks_entryId_idx" ON "journal_entry_remarks"("entryId");

-- CreateIndex
CREATE INDEX "journal_entry_remarks_journalId_idx" ON "journal_entry_remarks"("journalId");

-- CreateIndex
CREATE INDEX "journal_entry_remarks_status_idx" ON "journal_entry_remarks"("status");

-- CreateIndex
CREATE INDEX "journal_remark_replies_remarkId_idx" ON "journal_remark_replies"("remarkId");

-- CreateIndex
CREATE INDEX "journal_sections_journalId_idx" ON "journal_sections"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_sections_journalId_sectionNumber_key" ON "journal_sections"("journalId", "sectionNumber");

-- CreateIndex
CREATE INDEX "journal_entry_links_sourceEntryId_idx" ON "journal_entry_links"("sourceEntryId");

-- CreateIndex
CREATE INDEX "journal_entry_links_targetEntryId_idx" ON "journal_entry_links"("targetEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_links_sourceEntryId_targetEntryId_key" ON "journal_entry_links"("sourceEntryId", "targetEntryId");

-- CreateIndex
CREATE INDEX "id_closure_packages_projectId_idx" ON "id_closure_packages"("projectId");

-- CreateIndex
CREATE INDEX "inspections_projectId_idx" ON "inspections"("projectId");

-- CreateIndex
CREATE INDEX "inspections_status_idx" ON "inspections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_acts_approvalRouteId_key" ON "inspection_acts"("approvalRouteId");

-- CreateIndex
CREATE INDEX "inspection_acts_inspectionId_idx" ON "inspection_acts"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_approvalRouteId_key" ON "prescriptions"("approvalRouteId");

-- CreateIndex
CREATE INDEX "prescriptions_inspectionId_idx" ON "prescriptions"("inspectionId");

-- CreateIndex
CREATE INDEX "prescriptions_status_idx" ON "prescriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "defect_remediation_acts_approvalRouteId_key" ON "defect_remediation_acts"("approvalRouteId");

-- CreateIndex
CREATE INDEX "defect_remediation_acts_inspectionId_idx" ON "defect_remediation_acts"("inspectionId");

-- CreateIndex
CREATE INDEX "defect_remediation_acts_prescriptionId_idx" ON "defect_remediation_acts"("prescriptionId");

-- CreateIndex
CREATE INDEX "safety_briefings_projectId_idx" ON "safety_briefings"("projectId");

-- CreateIndex
CREATE INDEX "bim_sections_projectId_idx" ON "bim_sections"("projectId");

-- CreateIndex
CREATE INDEX "bim_sections_parentId_idx" ON "bim_sections"("parentId");

-- CreateIndex
CREATE INDEX "bim_models_projectId_idx" ON "bim_models"("projectId");

-- CreateIndex
CREATE INDEX "bim_models_sectionId_idx" ON "bim_models"("sectionId");

-- CreateIndex
CREATE INDEX "bim_models_projectId_isCurrent_idx" ON "bim_models"("projectId", "isCurrent");

-- CreateIndex
CREATE INDEX "bim_model_versions_modelId_idx" ON "bim_model_versions"("modelId");

-- CreateIndex
CREATE INDEX "bim_elements_modelId_idx" ON "bim_elements"("modelId");

-- CreateIndex
CREATE INDEX "bim_elements_ifcGuid_idx" ON "bim_elements"("ifcGuid");

-- CreateIndex
CREATE UNIQUE INDEX "bim_elements_modelId_ifcGuid_key" ON "bim_elements"("modelId", "ifcGuid");

-- CreateIndex
CREATE INDEX "bim_element_links_elementId_idx" ON "bim_element_links"("elementId");

-- CreateIndex
CREATE INDEX "bim_element_links_entityType_entityId_idx" ON "bim_element_links"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "bim_element_links_modelId_idx" ON "bim_element_links"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "bim_element_links_elementId_entityType_entityId_key" ON "bim_element_links"("elementId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "bim_access_projectId_idx" ON "bim_access"("projectId");

-- CreateIndex
CREATE INDEX "bim_access_userId_idx" ON "bim_access"("userId");

-- CreateIndex
CREATE INDEX "report_categories_projectId_idx" ON "report_categories"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_approvalRouteId_key" ON "reports"("approvalRouteId");

-- CreateIndex
CREATE INDEX "reports_projectId_idx" ON "reports"("projectId");

-- CreateIndex
CREATE INDEX "reports_categoryId_idx" ON "reports"("categoryId");

-- CreateIndex
CREATE INDEX "reports_authorId_idx" ON "reports"("authorId");

-- CreateIndex
CREATE INDEX "report_blocks_reportId_idx" ON "report_blocks"("reportId");

-- CreateIndex
CREATE INDEX "report_templates_organizationId_idx" ON "report_templates"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "thematic_report_configs_slug_key" ON "thematic_report_configs"("slug");

-- CreateIndex
CREATE INDEX "problem_issues_projectId_idx" ON "problem_issues"("projectId");

-- CreateIndex
CREATE INDEX "problem_issues_projectId_status_idx" ON "problem_issues"("projectId", "status");

-- CreateIndex
CREATE INDEX "problem_issues_assigneeOrgId_idx" ON "problem_issues"("assigneeOrgId");

-- CreateIndex
CREATE INDEX "problem_issues_verifierOrgId_idx" ON "problem_issues"("verifierOrgId");

-- CreateIndex
CREATE INDEX "problem_issues_typeRefId_idx" ON "problem_issues"("typeRefId");

-- CreateIndex
CREATE INDEX "problem_issue_attachments_issueId_idx" ON "problem_issue_attachments"("issueId");

-- CreateIndex
CREATE INDEX "land_plots_projectId_idx" ON "land_plots"("projectId");

-- CreateIndex
CREATE INDEX "technical_conditions_projectId_idx" ON "technical_conditions"("projectId");

-- CreateIndex
CREATE INDEX "funding_records_projectId_idx" ON "funding_records"("projectId");

-- CreateIndex
CREATE INDEX "limit_risks_projectId_idx" ON "limit_risks"("projectId");

-- CreateIndex
CREATE INDEX "video_cameras_projectId_idx" ON "video_cameras"("projectId");

-- CreateIndex
CREATE INDEX "project_coordinates_projectId_idx" ON "project_coordinates"("projectId");

-- CreateIndex
CREATE INDEX "project_indicators_projectId_groupName_idx" ON "project_indicators"("projectId", "groupName");

-- CreateIndex
CREATE INDEX "object_organizations_buildingObjectId_idx" ON "object_organizations"("buildingObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "object_organizations_buildingObjectId_organizationId_key" ON "object_organizations"("buildingObjectId", "organizationId");

-- CreateIndex
CREATE INDEX "object_persons_buildingObjectId_idx" ON "object_persons"("buildingObjectId");

-- CreateIndex
CREATE INDEX "object_participant_roles_orgParticipantId_idx" ON "object_participant_roles"("orgParticipantId");

-- CreateIndex
CREATE INDEX "object_participant_roles_personId_idx" ON "object_participant_roles"("personId");

-- CreateIndex
CREATE INDEX "person_appointments_personId_idx" ON "person_appointments"("personId");

-- CreateIndex
CREATE INDEX "sed_folders_projectId_idx" ON "sed_folders"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "sed_document_folders_documentId_folderId_key" ON "sed_document_folders"("documentId", "folderId");

-- CreateIndex
CREATE INDEX "workflow_regulations_organizationId_idx" ON "workflow_regulations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "sed_workflows_approvalRouteId_key" ON "sed_workflows"("approvalRouteId");

-- CreateIndex
CREATE INDEX "sed_workflows_documentId_idx" ON "sed_workflows"("documentId");

-- CreateIndex
CREATE INDEX "sed_workflow_messages_workflowId_idx" ON "sed_workflow_messages"("workflowId");

-- CreateIndex
CREATE INDEX "sed_links_documentId_idx" ON "sed_links"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "sed_links_documentId_entityType_entityId_key" ON "sed_links"("documentId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "sed_document_bases_workflowId_idx" ON "sed_document_bases"("workflowId");

-- CreateIndex
CREATE INDEX "activity_categories_projectId_idx" ON "activity_categories"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "activity_categories_projectId_name_key" ON "activity_categories"("projectId", "name");

-- CreateIndex
CREATE INDEX "activity_documents_categoryId_idx" ON "activity_documents"("categoryId");

-- CreateIndex
CREATE INDEX "activity_documents_projectId_idx" ON "activity_documents"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "pir_object_type_configs_projectId_key" ON "pir_object_type_configs"("projectId");

-- CreateIndex
CREATE INDEX "pir_object_type_configs_projectId_idx" ON "pir_object_type_configs"("projectId");

-- CreateIndex
CREATE INDEX "pir_category_configs_configId_idx" ON "pir_category_configs"("configId");

-- CreateIndex
CREATE INDEX "id_doc_categories_projectId_idx" ON "id_doc_categories"("projectId");

-- CreateIndex
CREATE INDEX "id_doc_categories_organizationId_idx" ON "id_doc_categories"("organizationId");

-- CreateIndex
CREATE INDEX "id_doc_categories_parentId_idx" ON "id_doc_categories"("parentId");

-- CreateIndex
CREATE INDEX "saved_field_values_fieldName_projectId_idx" ON "saved_field_values"("fieldName", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_field_values_fieldName_value_projectId_key" ON "saved_field_values"("fieldName", "value", "projectId");

-- CreateIndex
CREATE INDEX "defect_normative_refs_defectId_idx" ON "defect_normative_refs"("defectId");

-- CreateIndex
CREATE INDEX "task_roles_userId_role_idx" ON "task_roles"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "task_roles_taskId_userId_role_key" ON "task_roles"("taskId", "userId", "role");

-- CreateIndex
CREATE INDEX "task_groups_organizationId_idx" ON "task_groups"("organizationId");

-- CreateIndex
CREATE INDEX "task_groups_parentId_idx" ON "task_groups"("parentId");

-- CreateIndex
CREATE INDEX "task_labels_organizationId_idx" ON "task_labels"("organizationId");

-- CreateIndex
CREATE INDEX "task_label_on_task_labelId_idx" ON "task_label_on_task"("labelId");

-- CreateIndex
CREATE UNIQUE INDEX "task_types_key_key" ON "task_types"("key");

-- CreateIndex
CREATE INDEX "task_types_organizationId_idx" ON "task_types"("organizationId");

-- CreateIndex
CREATE INDEX "task_templates_organizationId_idx" ON "task_templates"("organizationId");

-- CreateIndex
CREATE INDEX "task_templates_typeId_idx" ON "task_templates"("typeId");

-- CreateIndex
CREATE INDEX "task_templates_groupId_idx" ON "task_templates"("groupId");

-- CreateIndex
CREATE INDEX "task_schedules_isActive_startDate_idx" ON "task_schedules"("isActive", "startDate");

-- CreateIndex
CREATE INDEX "task_checklist_items_taskId_idx" ON "task_checklist_items"("taskId");

-- CreateIndex
CREATE INDEX "task_reports_taskId_idx" ON "task_reports"("taskId");

-- CreateIndex
CREATE INDEX "task_comments_taskId_idx" ON "task_comments"("taskId");

-- CreateIndex
CREATE INDEX "reference_audits_entityType_entityId_idx" ON "reference_audits"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "reference_audits_organizationId_entityType_idx" ON "reference_audits"("organizationId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "currencies_organizationId_idx" ON "currencies"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "budget_types_code_key" ON "budget_types"("code");

-- CreateIndex
CREATE INDEX "budget_types_organizationId_idx" ON "budget_types"("organizationId");

-- CreateIndex
CREATE INDEX "measurement_units_ref_organizationId_idx" ON "measurement_units_ref"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "declension_cases_shortName_key" ON "declension_cases"("shortName");

-- CreateIndex
CREATE UNIQUE INDEX "contract_kinds_code_key" ON "contract_kinds"("code");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_ref_code_key" ON "document_types_ref"("code");

-- CreateIndex
CREATE INDEX "budget_expense_items_parentId_idx" ON "budget_expense_items"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "task_types_ref_code_key" ON "task_types_ref"("code");

-- CreateIndex
CREATE INDEX "task_types_ref_organizationId_idx" ON "task_types_ref"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "defect_categories_ref_code_key" ON "defect_categories_ref"("code");

-- CreateIndex
CREATE INDEX "defect_categories_ref_organizationId_idx" ON "defect_categories_ref"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "problem_issue_types_ref_code_key" ON "problem_issue_types_ref"("code");

-- CreateIndex
CREATE INDEX "problem_issue_types_ref_organizationId_idx" ON "problem_issue_types_ref"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_userId_key" ON "referral_codes"("userId");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- CreateIndex
CREATE INDEX "referrals_referredUserId_idx" ON "referrals"("referredUserId");

-- CreateIndex
CREATE INDEX "referrals_rewardStatus_idx" ON "referrals"("rewardStatus");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_credits_workspaceId_key" ON "workspace_credits"("workspaceId");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_creditId_idx" ON "credit_ledger_entries"("creditId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "payment_methods_workspaceId_isActive_idx" ON "payment_methods"("workspaceId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_workspaceId_providerMethodId_key" ON "payment_methods"("workspaceId", "providerMethodId");

-- CreateIndex
CREATE INDEX "subscription_events_subscriptionId_createdAt_idx" ON "subscription_events"("subscriptionId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "subscription_events_type_createdAt_idx" ON "subscription_events"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_providerReceiptId_key" ON "receipts"("providerReceiptId");

-- CreateIndex
CREATE INDEX "receipts_workspaceId_createdAt_idx" ON "receipts"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "receipts_subscriptionId_idx" ON "receipts"("subscriptionId");

-- CreateIndex
CREATE INDEX "receipts_status_idx" ON "receipts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_workspaceId_issuedAt_idx" ON "invoices"("workspaceId", "issuedAt" DESC);

-- CreateIndex
CREATE INDEX "invoices_status_dueAt_idx" ON "invoices"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_code_idx" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_code_redemptions_workspaceId_idx" ON "promo_code_redemptions"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "promo_code_redemptions_promoCodeId_workspaceId_key" ON "promo_code_redemptions"("promoCodeId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "dunning_attempts_paymentId_key" ON "dunning_attempts"("paymentId");

-- CreateIndex
CREATE INDEX "dunning_attempts_subscriptionId_attemptNumber_idx" ON "dunning_attempts"("subscriptionId", "attemptNumber");

-- CreateIndex
CREATE INDEX "dunning_attempts_scheduledAt_result_idx" ON "dunning_attempts"("scheduledAt", "result");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_key_idx" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags"("enabled");

-- CreateIndex
CREATE INDEX "audit_logs_workspaceId_createdAt_idx" ON "audit_logs"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "subscription_features"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_defaultPaymentMethodId_fkey" FOREIGN KEY ("defaultPaymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_activeSubscriptionId_fkey" FOREIGN KEY ("activeSubscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_workspaceMemberId_fkey" FOREIGN KEY ("workspaceMemberId") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_objects" ADD CONSTRAINT "building_objects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_objects" ADD CONSTRAINT "building_objects_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_objects" ADD CONSTRAINT "building_objects_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "building_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_parentContractId_fkey" FOREIGN KEY ("parentContractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "contract_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_contractKindId_fkey" FOREIGN KEY ("contractKindId") REFERENCES "contract_kinds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_participants" ADD CONSTRAINT "contract_participants_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_participants" ADD CONSTRAINT "contract_participants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ksi_nodes" ADD CONSTRAINT "ksi_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ksi_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_ksiNodeId_fkey" FOREIGN KEY ("ksiNodeId") REFERENCES "ksi_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_documents" ADD CONSTRAINT "material_documents_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_batches" ADD CONSTRAINT "material_batches_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_control_records" ADD CONSTRAINT "input_control_records_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "material_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_control_records" ADD CONSTRAINT "input_control_records_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_control_acts" ADD CONSTRAINT "input_control_acts_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "input_control_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_writeoffs" ADD CONSTRAINT "material_writeoffs_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "work_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_writeoffs" ADD CONSTRAINT "material_writeoffs_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_docs" ADD CONSTRAINT "execution_docs_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_docs" ADD CONSTRAINT "execution_docs_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "work_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_docs" ADD CONSTRAINT "execution_docs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_docs" ADD CONSTRAINT "execution_docs_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_docs" ADD CONSTRAINT "execution_docs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "id_doc_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_doc_links" ADD CONSTRAINT "execution_doc_links_sourceDocId_fkey" FOREIGN KEY ("sourceDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_doc_links" ADD CONSTRAINT "execution_doc_links_targetDocId_fkey" FOREIGN KEY ("targetDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_routes" ADD CONSTRAINT "signing_routes_executionDocId_fkey" FOREIGN KEY ("executionDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_steps" ADD CONSTRAINT "signing_steps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_steps" ADD CONSTRAINT "signing_steps_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "signing_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ks_act_form_data" ADD CONSTRAINT "ks_act_form_data_executionDocId_fkey" FOREIGN KEY ("executionDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_routes" ADD CONSTRAINT "approval_routes_executionDocId_fkey" FOREIGN KEY ("executionDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_routes" ADD CONSTRAINT "approval_routes_specialJournalId_fkey" FOREIGN KEY ("specialJournalId") REFERENCES "special_journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "approval_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_executionDocId_fkey" FOREIGN KEY ("executionDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_comments" ADD CONSTRAINT "doc_comments_executionDocId_fkey" FOREIGN KEY ("executionDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_comments" ADD CONSTRAINT "doc_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_comments" ADD CONSTRAINT "doc_comments_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_comments" ADD CONSTRAINT "doc_comments_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_comment_replies" ADD CONSTRAINT "doc_comment_replies_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "doc_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_comment_replies" ADD CONSTRAINT "doc_comment_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_documents" ADD CONSTRAINT "archive_documents_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_documents" ADD CONSTRAINT "archive_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ks2_acts" ADD CONSTRAINT "ks2_acts_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ks2_acts" ADD CONSTRAINT "ks2_acts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ks2_acts" ADD CONSTRAINT "ks2_acts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "id_doc_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ks2_acts" ADD CONSTRAINT "ks2_acts_correctionToKs2Id_fkey" FOREIGN KEY ("correctionToKs2Id") REFERENCES "ks2_acts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ks2_items" ADD CONSTRAINT "ks2_items_ks2ActId_fkey" FOREIGN KEY ("ks2ActId") REFERENCES "ks2_acts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ks2_items" ADD CONSTRAINT "ks2_items_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ks3_certificates" ADD CONSTRAINT "ks3_certificates_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ks3_certificates" ADD CONSTRAINT "ks3_certificates_ks2ActId_fkey" FOREIGN KEY ("ks2ActId") REFERENCES "ks2_acts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "id_registries" ADD CONSTRAINT "id_registries_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_imports" ADD CONSTRAINT "estimate_imports_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_imports" ADD CONSTRAINT "estimate_imports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_import_items" ADD CONSTRAINT "estimate_import_items_suggestedKsiNodeId_fkey" FOREIGN KEY ("suggestedKsiNodeId") REFERENCES "ksi_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_import_items" ADD CONSTRAINT "estimate_import_items_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_import_items" ADD CONSTRAINT "estimate_import_items_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "estimate_import_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_import_items" ADD CONSTRAINT "estimate_import_items_importId_fkey" FOREIGN KEY ("importId") REFERENCES "estimate_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "gantt_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_delegatedFromOrgId_fkey" FOREIGN KEY ("delegatedFromOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_delegatedToOrgId_fkey" FOREIGN KEY ("delegatedToOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_delegatedFromVersionId_fkey" FOREIGN KEY ("delegatedFromVersionId") REFERENCES "gantt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_versions" ADD CONSTRAINT "gantt_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "gantt_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "gantt_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_estimateItemId_fkey" FOREIGN KEY ("estimateItemId") REFERENCES "estimate_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_taskContractId_fkey" FOREIGN KEY ("taskContractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_task_exec_docs" ADD CONSTRAINT "gantt_task_exec_docs_ganttTaskId_fkey" FOREIGN KEY ("ganttTaskId") REFERENCES "gantt_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_task_exec_docs" ADD CONSTRAINT "gantt_task_exec_docs_execDocId_fkey" FOREIGN KEY ("execDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_task_exec_docs" ADD CONSTRAINT "gantt_task_exec_docs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_dependencies" ADD CONSTRAINT "gantt_dependencies_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "gantt_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_dependencies" ADD CONSTRAINT "gantt_dependencies_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "gantt_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_stages" ADD CONSTRAINT "gantt_stages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_daily_plans" ADD CONSTRAINT "gantt_daily_plans_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "gantt_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_daily_plans" ADD CONSTRAINT "gantt_daily_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_calendars" ADD CONSTRAINT "gantt_calendars_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "gantt_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_calendars" ADD CONSTRAINT "gantt_calendars_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "gantt_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_calendars" ADD CONSTRAINT "gantt_calendars_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_change_logs" ADD CONSTRAINT "gantt_change_logs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "gantt_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gantt_change_logs" ADD CONSTRAINT "gantt_change_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_substituteInspectorId_fkey" FOREIGN KEY ("substituteInspectorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_categoryRefId_fkey" FOREIGN KEY ("categoryRefId") REFERENCES "defect_categories_ref"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_templates" ADD CONSTRAINT "defect_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_comments" ADD CONSTRAINT "defect_comments_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_comments" ADD CONSTRAINT "defect_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_annotations" ADD CONSTRAINT "defect_annotations_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_portal_tokens" ADD CONSTRAINT "project_portal_tokens_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_portal_tokens" ADD CONSTRAINT "project_portal_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_sources" ADD CONSTRAINT "funding_sources_budgetTypeId_fkey" FOREIGN KEY ("budgetTypeId") REFERENCES "budget_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_sources" ADD CONSTRAINT "funding_sources_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "project_management_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "task_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "task_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_management_versions" ADD CONSTRAINT "project_management_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondences" ADD CONSTRAINT "correspondences_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondences" ADD CONSTRAINT "correspondences_senderOrgId_fkey" FOREIGN KEY ("senderOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondences" ADD CONSTRAINT "correspondences_receiverOrgId_fkey" FOREIGN KEY ("receiverOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondences" ADD CONSTRAINT "correspondences_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondences" ADD CONSTRAINT "correspondences_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence_attachments" ADD CONSTRAINT "correspondence_attachments_correspondenceId_fkey" FOREIGN KEY ("correspondenceId") REFERENCES "correspondences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfi_attachments" ADD CONSTRAINT "rfi_attachments_rfiId_fkey" FOREIGN KEY ("rfiId") REFERENCES "rfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_senderOrgId_fkey" FOREIGN KEY ("senderOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_receiverUserId_fkey" FOREIGN KEY ("receiverUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_documents" ADD CONSTRAINT "sed_documents_receiverOrgId_fkey" FOREIGN KEY ("receiverOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_attachments" ADD CONSTRAINT "sed_attachments_sedDocId_fkey" FOREIGN KEY ("sedDocId") REFERENCES "sed_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_categories" ADD CONSTRAINT "contract_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_payments" ADD CONSTRAINT "contract_payments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_payments" ADD CONSTRAINT "contract_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_obligations" ADD CONSTRAINT "contract_obligations_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_advances" ADD CONSTRAINT "contract_advances_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_executions" ADD CONSTRAINT "contract_executions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_guarantees" ADD CONSTRAINT "contract_guarantees_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_detail_infos" ADD CONSTRAINT "contract_detail_infos_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_financial_tables" ADD CONSTRAINT "contract_financial_tables_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_doc_links" ADD CONSTRAINT "contract_doc_links_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_doc_links" ADD CONSTRAINT "contract_doc_links_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "project_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "project_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "project_folders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_document_versions" ADD CONSTRAINT "project_document_versions_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_document_versions" ADD CONSTRAINT "project_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "project_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_agreedById_fkey" FOREIGN KEY ("agreedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_customerOrgId_fkey" FOREIGN KEY ("customerOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_customerPersonId_fkey" FOREIGN KEY ("customerPersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_tasks" ADD CONSTRAINT "design_tasks_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_task_params" ADD CONSTRAINT "design_task_params_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "design_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_task_comments" ADD CONSTRAINT "design_task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "design_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_task_comments" ADD CONSTRAINT "design_task_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_task_comments" ADD CONSTRAINT "design_task_comments_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_task_comments" ADD CONSTRAINT "design_task_comments_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_responsibleOrgId_fkey" FOREIGN KEY ("responsibleOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_parentDocId_fkey" FOREIGN KEY ("parentDocId") REFERENCES "design_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_reviewerOrgId_fkey" FOREIGN KEY ("reviewerOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_doc_comments" ADD CONSTRAINT "design_doc_comments_docId_fkey" FOREIGN KEY ("docId") REFERENCES "design_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_doc_comments" ADD CONSTRAINT "design_doc_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_doc_comments" ADD CONSTRAINT "design_doc_comments_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_doc_comments" ADD CONSTRAINT "design_doc_comments_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registries" ADD CONSTRAINT "pir_registries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registries" ADD CONSTRAINT "pir_registries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registries" ADD CONSTRAINT "pir_registries_senderOrgId_fkey" FOREIGN KEY ("senderOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registries" ADD CONSTRAINT "pir_registries_receiverOrgId_fkey" FOREIGN KEY ("receiverOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registries" ADD CONSTRAINT "pir_registries_senderPersonId_fkey" FOREIGN KEY ("senderPersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registries" ADD CONSTRAINT "pir_registries_receiverPersonId_fkey" FOREIGN KEY ("receiverPersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registry_items" ADD CONSTRAINT "pir_registry_items_registryId_fkey" FOREIGN KEY ("registryId") REFERENCES "pir_registries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_registry_items" ADD CONSTRAINT "pir_registry_items_docId_fkey" FOREIGN KEY ("docId") REFERENCES "design_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_closure_acts" ADD CONSTRAINT "pir_closure_acts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_closure_acts" ADD CONSTRAINT "pir_closure_acts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_closure_acts" ADD CONSTRAINT "pir_closure_acts_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_closure_items" ADD CONSTRAINT "pir_closure_items_actId_fkey" FOREIGN KEY ("actId") REFERENCES "pir_closure_acts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_templates" ADD CONSTRAINT "approval_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_template_levels" ADD CONSTRAINT "approval_template_levels_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "approval_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_template_levels" ADD CONSTRAINT "approval_template_levels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_doc_changes" ADD CONSTRAINT "design_doc_changes_docId_fkey" FOREIGN KEY ("docId") REFERENCES "design_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_doc_changes" ADD CONSTRAINT "design_doc_changes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamp_titles" ADD CONSTRAINT "stamp_titles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_versions" ADD CONSTRAINT "estimate_versions_sourceImportId_fkey" FOREIGN KEY ("sourceImportId") REFERENCES "estimate_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_versions" ADD CONSTRAINT "estimate_versions_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "estimate_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_versions" ADD CONSTRAINT "estimate_versions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_versions" ADD CONSTRAINT "estimate_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_versions" ADD CONSTRAINT "estimate_versions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "estimate_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_chapters" ADD CONSTRAINT "estimate_chapters_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "estimate_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_chapters" ADD CONSTRAINT "estimate_chapters_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "estimate_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_ksiNodeId_fkey" FOREIGN KEY ("ksiNodeId") REFERENCES "ksi_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_importItemId_fkey" FOREIGN KEY ("importItemId") REFERENCES "estimate_import_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "estimate_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_change_logs" ADD CONSTRAINT "estimate_change_logs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "estimate_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_change_logs" ADD CONSTRAINT "estimate_change_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_contracts" ADD CONSTRAINT "estimate_contracts_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_contracts" ADD CONSTRAINT "estimate_contracts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_contract_versions" ADD CONSTRAINT "estimate_contract_versions_estimateContractId_fkey" FOREIGN KEY ("estimateContractId") REFERENCES "estimate_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_contract_versions" ADD CONSTRAINT "estimate_contract_versions_estimateVersionId_fkey" FOREIGN KEY ("estimateVersionId") REFERENCES "estimate_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_categories" ADD CONSTRAINT "estimate_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "estimate_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_categories" ADD CONSTRAINT "estimate_categories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_additional_costs" ADD CONSTRAINT "estimate_additional_costs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "estimate_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_additional_costs" ADD CONSTRAINT "estimate_additional_costs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_additional_cost_chapters" ADD CONSTRAINT "estimate_additional_cost_chapters_additionalCostId_fkey" FOREIGN KEY ("additionalCostId") REFERENCES "estimate_additional_costs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_additional_cost_estimates" ADD CONSTRAINT "estimate_additional_cost_estimates_additionalCostId_fkey" FOREIGN KEY ("additionalCostId") REFERENCES "estimate_additional_costs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_additional_cost_estimates" ADD CONSTRAINT "estimate_additional_cost_estimates_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "estimate_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_coefficients" ADD CONSTRAINT "estimate_coefficients_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "estimate_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_nomenclature" ADD CONSTRAINT "material_nomenclature_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "material_request_item_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "material_nomenclature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_ganttTaskId_fkey" FOREIGN KEY ("ganttTaskId") REFERENCES "gantt_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "material_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_comments" ADD CONSTRAINT "material_request_comments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "material_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_comments" ADD CONSTRAINT "material_request_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_comments" ADD CONSTRAINT "material_request_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "material_request_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_item_statuses" ADD CONSTRAINT "material_request_item_statuses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_customerOrgId_fkey" FOREIGN KEY ("customerOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "material_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "material_nomenclature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "supplier_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_items" ADD CONSTRAINT "warehouse_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_items" ADD CONSTRAINT "warehouse_items_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "material_nomenclature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "supplier_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_movement_lines" ADD CONSTRAINT "warehouse_movement_lines_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "warehouse_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_movement_lines" ADD CONSTRAINT "warehouse_movement_lines_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "material_nomenclature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_movement_lines" ADD CONSTRAINT "warehouse_movement_lines_materialBatchId_fkey" FOREIGN KEY ("materialBatchId") REFERENCES "material_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journals" ADD CONSTRAINT "special_journals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journals" ADD CONSTRAINT "special_journals_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journals" ADD CONSTRAINT "special_journals_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journals" ADD CONSTRAINT "special_journals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journal_entries" ADD CONSTRAINT "special_journal_entries_executionDocId_fkey" FOREIGN KEY ("executionDocId") REFERENCES "execution_docs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journal_entries" ADD CONSTRAINT "special_journal_entries_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "journal_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journal_entries" ADD CONSTRAINT "special_journal_entries_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "special_journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journal_entries" ADD CONSTRAINT "special_journal_entries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_remarks" ADD CONSTRAINT "journal_entry_remarks_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "special_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_remarks" ADD CONSTRAINT "journal_entry_remarks_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "special_journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_remarks" ADD CONSTRAINT "journal_entry_remarks_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_remarks" ADD CONSTRAINT "journal_entry_remarks_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_remarks" ADD CONSTRAINT "journal_entry_remarks_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_remark_replies" ADD CONSTRAINT "journal_remark_replies_remarkId_fkey" FOREIGN KEY ("remarkId") REFERENCES "journal_entry_remarks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_remark_replies" ADD CONSTRAINT "journal_remark_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_sections" ADD CONSTRAINT "journal_sections_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "special_journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_links" ADD CONSTRAINT "journal_entry_links_sourceEntryId_fkey" FOREIGN KEY ("sourceEntryId") REFERENCES "special_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_links" ADD CONSTRAINT "journal_entry_links_targetEntryId_fkey" FOREIGN KEY ("targetEntryId") REFERENCES "special_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_links" ADD CONSTRAINT "journal_entry_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "id_closure_packages" ADD CONSTRAINT "id_closure_packages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "id_closure_packages" ADD CONSTRAINT "id_closure_packages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_acts" ADD CONSTRAINT "inspection_acts_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_acts" ADD CONSTRAINT "inspection_acts_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_acts" ADD CONSTRAINT "inspection_acts_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_remediation_acts" ADD CONSTRAINT "defect_remediation_acts_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_remediation_acts" ADD CONSTRAINT "defect_remediation_acts_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_remediation_acts" ADD CONSTRAINT "defect_remediation_acts_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_remediation_acts" ADD CONSTRAINT "defect_remediation_acts_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_briefings" ADD CONSTRAINT "safety_briefings_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_briefings" ADD CONSTRAINT "safety_briefings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_sections" ADD CONSTRAINT "bim_sections_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "bim_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_sections" ADD CONSTRAINT "bim_sections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_models" ADD CONSTRAINT "bim_models_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "bim_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_models" ADD CONSTRAINT "bim_models_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_models" ADD CONSTRAINT "bim_models_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_model_versions" ADD CONSTRAINT "bim_model_versions_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "bim_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_model_versions" ADD CONSTRAINT "bim_model_versions_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_elements" ADD CONSTRAINT "bim_elements_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "bim_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_element_links" ADD CONSTRAINT "bim_element_links_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "bim_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_element_links" ADD CONSTRAINT "bim_element_links_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "bim_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_access" ADD CONSTRAINT "bim_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bim_access" ADD CONSTRAINT "bim_access_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_categories" ADD CONSTRAINT "report_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "report_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_categories" ADD CONSTRAINT "report_categories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "report_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "report_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_blocks" ADD CONSTRAINT "report_blocks_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_issues" ADD CONSTRAINT "problem_issues_assigneeOrgId_fkey" FOREIGN KEY ("assigneeOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_issues" ADD CONSTRAINT "problem_issues_verifierOrgId_fkey" FOREIGN KEY ("verifierOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_issues" ADD CONSTRAINT "problem_issues_typeRefId_fkey" FOREIGN KEY ("typeRefId") REFERENCES "problem_issue_types_ref"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_issues" ADD CONSTRAINT "problem_issues_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_issues" ADD CONSTRAINT "problem_issues_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_issue_attachments" ADD CONSTRAINT "problem_issue_attachments_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "problem_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_plots" ADD CONSTRAINT "land_plots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_plots" ADD CONSTRAINT "land_plots_ownerOrgId_fkey" FOREIGN KEY ("ownerOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_plots" ADD CONSTRAINT "land_plots_tenantOrgId_fkey" FOREIGN KEY ("tenantOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_conditions" ADD CONSTRAINT "technical_conditions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_conditions" ADD CONSTRAINT "technical_conditions_responsibleOrgId_fkey" FOREIGN KEY ("responsibleOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_conditions" ADD CONSTRAINT "technical_conditions_landPlotId_fkey" FOREIGN KEY ("landPlotId") REFERENCES "land_plots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_records" ADD CONSTRAINT "funding_records_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limit_risks" ADD CONSTRAINT "limit_risks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limit_risks" ADD CONSTRAINT "limit_risks_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_cameras" ADD CONSTRAINT "video_cameras_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_cameras" ADD CONSTRAINT "video_cameras_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_coordinates" ADD CONSTRAINT "project_coordinates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_indicators" ADD CONSTRAINT "project_indicators_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_organizations" ADD CONSTRAINT "object_organizations_buildingObjectId_fkey" FOREIGN KEY ("buildingObjectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_organizations" ADD CONSTRAINT "object_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_persons" ADD CONSTRAINT "object_persons_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_persons" ADD CONSTRAINT "object_persons_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_persons" ADD CONSTRAINT "object_persons_buildingObjectId_fkey" FOREIGN KEY ("buildingObjectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_participant_roles" ADD CONSTRAINT "object_participant_roles_orgParticipantId_fkey" FOREIGN KEY ("orgParticipantId") REFERENCES "object_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_participant_roles" ADD CONSTRAINT "object_participant_roles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "object_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_appointments" ADD CONSTRAINT "person_appointments_personId_fkey" FOREIGN KEY ("personId") REFERENCES "object_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_folders" ADD CONSTRAINT "sed_folders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_folders" ADD CONSTRAINT "sed_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "sed_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_document_folders" ADD CONSTRAINT "sed_document_folders_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "sed_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_document_folders" ADD CONSTRAINT "sed_document_folders_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "sed_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_regulations" ADD CONSTRAINT "workflow_regulations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_workflows" ADD CONSTRAINT "sed_workflows_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "sed_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_workflows" ADD CONSTRAINT "sed_workflows_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_workflows" ADD CONSTRAINT "sed_workflows_approvalRouteId_fkey" FOREIGN KEY ("approvalRouteId") REFERENCES "approval_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_workflows" ADD CONSTRAINT "sed_workflows_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "workflow_regulations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_workflow_messages" ADD CONSTRAINT "sed_workflow_messages_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "sed_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_workflow_messages" ADD CONSTRAINT "sed_workflow_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_links" ADD CONSTRAINT "sed_links_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "sed_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sed_document_bases" ADD CONSTRAINT "sed_document_bases_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "sed_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_categories" ADD CONSTRAINT "activity_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "activity_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_categories" ADD CONSTRAINT "activity_categories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_documents" ADD CONSTRAINT "activity_documents_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "activity_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_documents" ADD CONSTRAINT "activity_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_documents" ADD CONSTRAINT "activity_documents_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_object_type_configs" ADD CONSTRAINT "pir_object_type_configs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_category_configs" ADD CONSTRAINT "pir_category_configs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "pir_object_type_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "id_doc_categories" ADD CONSTRAINT "id_doc_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "id_doc_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "id_doc_categories" ADD CONSTRAINT "id_doc_categories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "id_doc_categories" ADD CONSTRAINT "id_doc_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_field_values" ADD CONSTRAINT "saved_field_values_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_field_values" ADD CONSTRAINT "saved_field_values_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_normative_refs" ADD CONSTRAINT "defect_normative_refs_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_roles" ADD CONSTRAINT "task_roles_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_roles" ADD CONSTRAINT "task_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_groups" ADD CONSTRAINT "task_groups_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "task_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_groups" ADD CONSTRAINT "task_groups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_groups" ADD CONSTRAINT "task_groups_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "task_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_label_on_task" ADD CONSTRAINT "task_label_on_task_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_label_on_task" ADD CONSTRAINT "task_label_on_task_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "task_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_types" ADD CONSTRAINT "task_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "task_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "task_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_parentTemplateId_fkey" FOREIGN KEY ("parentTemplateId") REFERENCES "task_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schedules" ADD CONSTRAINT "task_schedules_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "task_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reports" ADD CONSTRAINT "task_reports_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reports" ADD CONSTRAINT "task_reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_audits" ADD CONSTRAINT "reference_audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_audits" ADD CONSTRAINT "reference_audits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_types" ADD CONSTRAINT "budget_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_units_ref" ADD CONSTRAINT "measurement_units_ref_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_kinds" ADD CONSTRAINT "contract_kinds_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_types_ref" ADD CONSTRAINT "document_types_ref_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_expense_items" ADD CONSTRAINT "budget_expense_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "budget_expense_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_expense_items" ADD CONSTRAINT "budget_expense_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_types_ref" ADD CONSTRAINT "task_types_ref_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_categories_ref" ADD CONSTRAINT "defect_categories_ref_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_issue_types_ref" ADD CONSTRAINT "problem_issue_types_ref_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_credits" ADD CONSTRAINT "workspace_credits_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "workspace_credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_rules" ADD CONSTRAINT "promo_code_rules_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_rules" ADD CONSTRAINT "promo_code_rules_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_attempts" ADD CONSTRAINT "dunning_attempts_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_attempts" ADD CONSTRAINT "dunning_attempts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

