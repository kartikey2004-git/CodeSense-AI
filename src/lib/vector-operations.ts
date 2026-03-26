import { db } from "@/server/db";

/**
 * Vector operations for pgvector embeddings stored as raw bytes
 * This avoids Unsupported type issues and migration drift
 */

export interface VectorSearchResult {
  id: string;
  fileName: string;
  summary: string;
  sourceCode: string;
  similarity: number;
}

/**
 * Convert embedding array to bytes for storage
 */
export function embeddingToBytes(embedding: number[]): Buffer {
  const buffer = Buffer.allocUnsafe(embedding.length * 4);
  for (let i = 0; i < embedding.length; i++) {
    const value = embedding[i];
    if (value !== undefined) {
      buffer.writeFloatLE(value, i * 4);
    }
  }
  return buffer;
}

/**
 * Convert bytes back to embedding array
 */
export function bytesToEmbedding(bytes: Uint8Array): number[] {
  const buffer = Buffer.from(bytes);
  const embedding: number[] = [];
  for (let i = 0; i < buffer.length; i += 4) {
    embedding.push(buffer.readFloatLE(i));
  }
  return embedding;
}

/**
 * Store embedding with vector similarity search capability
 */
export async function storeEmbedding({
  projectId,
  fileName,
  sourceCode,
  summary,
  embedding,
}: {
  projectId: string;
  fileName: string;
  sourceCode: string;
  summary: string;
  embedding: number[];
}) {
  const embeddingBytes = embeddingToBytes(embedding);

  return await db.sourceCodeEmbedding.create({
    data: {
      projectId,
      fileName,
      sourceCode,
      summary,
      summaryEmbedding: new Uint8Array(embeddingBytes),
    },
  });
}

/**
 * Perform vector similarity search using raw SQL
 */
export async function vectorSimilaritySearch({
  projectId,
  queryEmbedding,
  limit = 10,
  threshold = 0.7,
}: {
  projectId: string;
  queryEmbedding: number[];
  limit?: number;
  threshold?: number;
}): Promise<VectorSearchResult[]> {
  const queryVector = `[${queryEmbedding.join(",")}]`;

  const results = await db.$queryRaw<
    Array<{
      id: string;
      fileName: string;
      summary: string;
      sourceCode: string;
      similarity: number;
    }>
  >`
    SELECT 
      id,
      file_name as "fileName",
      summary,
      source_code as "sourceCode",
      1 - (summary_embedding <=> ${queryVector}::vector) as similarity
    FROM source_code_embeddings 
    WHERE project_id = ${projectId}
      AND summary_embedding IS NOT NULL
      AND (1 - (summary_embedding <=> ${queryVector}::vector)) > ${threshold}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;

  return results.map((result) => ({
    id: result.id,
    fileName: result.fileName,
    summary: result.summary,
    sourceCode: result.sourceCode,
    similarity: Number(result.similarity),
  }));
}

/**
 * Get embedding by ID
 */
export async function getEmbedding(id: string) {
  const embedding = await db.sourceCodeEmbedding.findUnique({
    where: { id },
  });

  if (!embedding || !embedding.summaryEmbedding) {
    return null;
  }

  return {
    id: embedding.id,
    projectId: embedding.projectId,
    summary: embedding.summary,
    sourceCode: embedding.sourceCode,
    fileName: embedding.fileName,
    embedding: bytesToEmbedding(embedding.summaryEmbedding),
  };
}

/**
 * Delete all embeddings for a project
 */
export async function deleteProjectEmbeddings(projectId: string) {
  return await db.sourceCodeEmbedding.deleteMany({
    where: { projectId },
  });
}

/**
 * Get embedding statistics for a project
 */
export async function getProjectEmbeddingStats(projectId: string) {
  const stats = await db.sourceCodeEmbedding.aggregate({
    where: { projectId },
    _count: {
      id: true,
    },
  });

  // Get vector dimension info using raw SQL
  const vectorStats = await db.$queryRaw<
    Array<{
      avg_dims: number;
      min_dims: number;
      max_dims: number;
    }>
  >`
    SELECT 
      AVG(vector_dims(summary_embedding)) as avg_dims,
      MIN(vector_dims(summary_embedding)) as min_dims,
      MAX(vector_dims(summary_embedding)) as max_dims
    FROM source_code_embeddings 
    WHERE project_id = ${projectId}
      AND summary_embedding IS NOT NULL
  `;

  return {
    totalEmbeddings: stats._count.id,
    vectorDimensions: vectorStats[0] || {
      avg_dims: 0,
      min_dims: 0,
      max_dims: 0,
    },
  };
}
