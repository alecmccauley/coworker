import { get_encoding, type Tiktoken } from "@dqbd/tiktoken";

const DEFAULT_ENCODING = "cl100k_base";

let encoder: Tiktoken | null = null;

export function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = get_encoding(DEFAULT_ENCODING);
  }
  return encoder;
}

export function encodeText(text: string): Uint32Array {
  return getEncoder().encode(text);
}

export function decodeTokens(tokens: Uint32Array): string {
  const bytes = getEncoder().decode(tokens);
  return new TextDecoder().decode(bytes);
}

export function countTokens(text: string): number {
  return encodeText(text).length;
}
