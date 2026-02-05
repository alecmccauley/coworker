import { decodeTokens, encodeText } from "./tokenizer";

export interface TextChunk {
  text: string;
  tokenCount: number;
}

export interface ChunkOptions {
  chunkTokens?: number;
  overlapTokens?: number;
}

const DEFAULT_CHUNK_TOKENS = 600;
const DEFAULT_OVERLAP_TOKENS = 80;

export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const chunkTokens = options.chunkTokens ?? DEFAULT_CHUNK_TOKENS;
  const overlapTokens = options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;

  if (!text.trim()) {
    return [];
  }

  const tokens = encodeText(text);
  if (tokens.length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const step = Math.max(1, chunkTokens - overlapTokens);

  for (let start = 0; start < tokens.length; start += step) {
    const end = Math.min(tokens.length, start + chunkTokens);
    const slice = tokens.slice(start, end);
    const chunkTextValue = decodeTokens(slice).trim();
    if (!chunkTextValue) {
      continue;
    }
    chunks.push({
      text: chunkTextValue,
      tokenCount: slice.length,
    });
  }

  return chunks;
}
