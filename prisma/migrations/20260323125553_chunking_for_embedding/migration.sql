-- AlterTable
ALTER TABLE "SourceCodeEmbedding" ADD COLUMN     "chunkContent" TEXT,
ADD COLUMN     "chunkIndex" INTEGER,
ADD COLUMN     "chunkMetadata" JSONB,
ADD COLUMN     "embeddingType" TEXT NOT NULL DEFAULT 'file',
ADD COLUMN     "isChunked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalChunks" INTEGER;

-- CreateIndex
CREATE INDEX "SourceCodeEmbedding_projectId_fileName_idx" ON "SourceCodeEmbedding"("projectId", "fileName");

-- CreateIndex
CREATE INDEX "SourceCodeEmbedding_projectId_isChunked_idx" ON "SourceCodeEmbedding"("projectId", "isChunked");

-- CreateIndex
CREATE INDEX "SourceCodeEmbedding_projectId_embeddingType_idx" ON "SourceCodeEmbedding"("projectId", "embeddingType");
