-- Migration: add_signing_routes
-- Добавляет маршруты подписания ИД (подготовка к интеграции КриптоПро CSP)
-- Модели: SigningRoute (1:1 к ExecutionDoc), SigningStep (N:1 к SigningRoute и User)

-- Enum: статус маршрута подписания
CREATE TYPE "SigningRouteStatus" AS ENUM ('PENDING', 'SIGNED', 'REJECTED');

-- Enum: статус шага подписания
CREATE TYPE "SigningStepStatus" AS ENUM ('WAITING', 'SIGNED', 'REJECTED');

-- Таблица маршрутов подписания
CREATE TABLE "signing_routes" (
    "id"             TEXT NOT NULL,
    "status"         "SigningRouteStatus" NOT NULL DEFAULT 'PENDING',
    "executionDocId" TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signing_routes_pkey" PRIMARY KEY ("id")
);

-- Уникальный индекс: один маршрут на документ
CREATE UNIQUE INDEX "signing_routes_executionDocId_key" ON "signing_routes"("executionDocId");

-- FK: signing_routes → execution_docs (CASCADE DELETE)
ALTER TABLE "signing_routes"
    ADD CONSTRAINT "signing_routes_executionDocId_fkey"
    FOREIGN KEY ("executionDocId")
    REFERENCES "execution_docs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Таблица шагов подписания
CREATE TABLE "signing_steps" (
    "id"              TEXT NOT NULL,
    "stepIndex"       INTEGER NOT NULL,
    "status"          "SigningStepStatus" NOT NULL DEFAULT 'WAITING',
    "signedAt"        TIMESTAMP(3),
    "certificateInfo" TEXT,
    "userId"          TEXT NOT NULL,
    "routeId"         TEXT NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signing_steps_pkey" PRIMARY KEY ("id")
);

-- Индексы для signing_steps
CREATE INDEX "signing_steps_routeId_idx" ON "signing_steps"("routeId");
CREATE INDEX "signing_steps_userId_idx"  ON "signing_steps"("userId");

-- FK: signing_steps → signing_routes (CASCADE DELETE)
ALTER TABLE "signing_steps"
    ADD CONSTRAINT "signing_steps_routeId_fkey"
    FOREIGN KEY ("routeId")
    REFERENCES "signing_routes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: signing_steps → users
ALTER TABLE "signing_steps"
    ADD CONSTRAINT "signing_steps_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
