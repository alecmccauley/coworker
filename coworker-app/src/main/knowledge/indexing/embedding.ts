import { encodeText } from "./tokenizer";

export const EMBEDDING_DIMENSION = 384;

export function embedText(text: string): Float32Array {
  const tokens = encodeText(text);
  const vector = new Float32Array(EMBEDDING_DIMENSION);

  for (const token of tokens) {
    const index = token % EMBEDDING_DIMENSION;
    vector[index] += 1;
  }

  let norm = 0;
  for (const value of vector) {
    norm += value * value;
  }

  if (norm > 0) {
    const scale = 1 / Math.sqrt(norm);
    for (let i = 0; i < vector.length; i += 1) {
      vector[i] = vector[i] * scale;
    }
  }

  return vector;
}

export function serializeEmbedding(vector: Float32Array): Buffer {
  return Buffer.from(vector.buffer);
}
