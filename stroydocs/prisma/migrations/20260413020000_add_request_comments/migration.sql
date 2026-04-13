-- CreateTable: material_request_comments
CREATE TABLE "material_request_comments" (
    "id"        TEXT NOT NULL,
    "text"      TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    "parentId"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_request_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_request_comments_requestId_idx" ON "material_request_comments"("requestId");

-- AddForeignKey
ALTER TABLE "material_request_comments"
    ADD CONSTRAINT "material_request_comments_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "material_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_comments"
    ADD CONSTRAINT "material_request_comments_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_comments"
    ADD CONSTRAINT "material_request_comments_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "material_request_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
