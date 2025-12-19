import { RecursiveChunker, Chunk } from '@chonkiejs/core';


export async function chunkDocument(text: string): Promise<Chunk[]> {
  const chunker = await RecursiveChunker.create({ // TODO: change this to a semantic chunker
    chunkSize: 512
  });
  
  return await chunker.chunk(text);
}

export async function updateEmbeddingsForFile(filePath: string, content: string, localStorage: any): Promise<void> {
  const chunks = await chunkDocument(content);
  
  // Get existing embeddings for the file
  const existingEmbeddings = localStorage.embeddings.getEmbeddingsByFilePath(filePath);
  const existingHashMap: Map<string, { id: number; embedding_vector: Buffer; chunk_index: number }> = new Map(
    existingEmbeddings.map((e: any) => [e.content_hash, { id: e.id, embedding_vector: e.embedding_vector, chunk_index: e.chunk_index ?? 0 }])
  );

  // Build new chunk set, preserving relative order (chunk_index)
  const newItems: Array<{content_hash: string, embedding_vector: Buffer, file_path: string, chunk_index: number}> = [];
  const newHashes = new Set<string>();
  const chunkIndexUpdates: Array<{id: number; chunk_index: number}> = [];

  chunks.forEach((chunk, index) => {
    const content_hash = generateContentHash(chunk.text);
    newHashes.add(content_hash);

    const existing = existingHashMap.get(content_hash);
    if (existing) {
      if (existing.chunk_index !== index) {
        chunkIndexUpdates.push({ id: existing.id, chunk_index: index });
      }
      return; // keep existing embedding_vector
    }

    // Only generate embedding if it doesn't exist already
    newItems.push({
      content_hash,
      embedding_vector: generateEmbeddingVector(chunk.text),
      file_path: filePath,
      chunk_index: index
    });
  });

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

function generateEmbeddingVector(content: string): Buffer {
  // Placeholder function to generate a dummy embedding vector
  const vector = new Float32Array(128).fill(0).map((_, i) => Math.random());
  return Buffer.from(vector.buffer);
} 
