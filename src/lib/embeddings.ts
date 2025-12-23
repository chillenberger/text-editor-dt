import { RecursiveChunker, Chunk } from '@chonkiejs/core';
import OpenAI from "openai";

if (!import.meta.env.VITE_OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set. Provide it via environment at launch time.");
}

const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

export async function chunkDocument(text: string): Promise<Chunk[]> {
  const chunker = await RecursiveChunker.create({ // TODO: change this to a semantic chunker
    chunkSize: 512
  });

  const chunks = await chunker.chunk(text);

  console.log("Chunks: ", chunks);
  
  return chunks;
}

export async function updateEmbeddingsForFile(filePath: string, content: string, localStorage: any): Promise<void> {
  const chunks = await chunkDocument(content);
  
  // Get existing embeddings for the file
  const existingEmbeddings = localStorage.embeddings.getEmbeddingsByFilePath(filePath);
  const existingHashMap: Map<string, { id: number; embedding_vector: Buffer; chunk_index: number }> = new Map(
    existingEmbeddings.map((e: any) => [e.content_hash, { id: e.id, embedding_vector: e.embedding_vector, chunk_index: e.chunk_index ?? 0 }])
  );

  // Build new chunk set, preserving relative order (chunk_index)
  const newItems: Array<{content_hash: string, embedding_vector: number[], file_path: string, chunk_index: number}> = [];
  const newHashes = new Set<string>();
  const chunkIndexUpdates: Array<{id: number; chunk_index: number}> = [];

  for (const [index, chunk] of chunks.entries()) {
    const content_hash = generateContentHash(chunk.text);
    newHashes.add(content_hash);

    const existing = existingHashMap.get(content_hash);
    // Only generate embedding if it doesn't exist already
    if (existing) {
      if (existing.chunk_index !== index) {
        chunkIndexUpdates.push({ id: existing.id, chunk_index: index });
      }
    } else {
      const embedding_vector = await generateEmbeddingVector(chunk.text);

      newItems.push({
        content_hash,
        embedding_vector,
        file_path: filePath,
        chunk_index: index
      });
    }
  };

  // Delete embeddings that are no longer present
  for (const [hash, { id }] of existingHashMap) {
    if (!newHashes.has(hash)) {
      localStorage.embeddings.deleteEmbeddingById(id);
    }
  }

  // Update chunk_index for existing embeddings that moved
  for (const update of chunkIndexUpdates) {
    localStorage.embeddings.updateChunkIndex(update.id, update.chunk_index);
  }

  // Insert new embeddings only, in order
  if (newItems.length > 0) {
    localStorage.embeddings.insertMany(newItems);
  }
}

function generateContentHash(content: string): string {
  // Simple hash function for demonstration purposes
  let hash = 0, i, chr;
  for (i = 0; i < content.length; i++) {
    chr   = content.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
}

async function generateEmbeddingVector(content: string): Promise<number[]> {
  console.log("calculating embedding for content of length: ", content.length);
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: content
  });

  return embedding.data[0].embedding;
} 

// Search embeddings for top K relevant embeddings.
export async function searchEmbeddings(query: string, localStorage: any, topK: number = 5, filePaths: string[]): Promise<Array<{file_path: string; score: number}>> {
  const embedding_vector = await generateEmbeddingVector(query);
  return localStorage.embeddings.getTopKSimilarEmbeddings(embedding_vector, topK, filePaths);
}

// Distinct file paths only
export async function searchEmbeddingsDistinct(query: string, localStorage: any, topK: number = 5, filePaths: string[]): Promise<Array<{file_path: string; score: number}>> {
  const embedding_vector = await generateEmbeddingVector(query);
  return localStorage.embeddings.getTopKDistinctFilePaths(embedding_vector, topK, filePaths);
}