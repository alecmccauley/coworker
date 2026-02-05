import mammoth from "mammoth";
import { PDFExtract, type PDFExtractOptions } from "pdf.js-extract";
import { extname } from "path";

export interface ExtractionWarning {
  type: string;
  message: string;
}

export interface ExtractedText {
  text: string;
  richText?: string;
  warnings: ExtractionWarning[];
}

export interface ExtractInput {
  buffer: Buffer;
  mime?: string | null;
  filename?: string | null;
}

const pdfExtract = new PDFExtract();

export async function extractTextFromBlob(
  input: ExtractInput,
): Promise<ExtractedText> {
  const mime = input.mime ?? "";
  const extension = input.filename ? extname(input.filename).toLowerCase() : "";

  if (mime === "application/pdf" || extension === ".pdf") {
    return extractPdfText(input.buffer);
  }

  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx"
  ) {
    return extractDocxText(input.buffer);
  }

  if (mime === "text/markdown" || extension === ".md") {
    return extractPlainText(input.buffer);
  }

  if (mime.startsWith("text/")) {
    return extractPlainText(input.buffer);
  }

  return extractPlainText(input.buffer);
}

async function extractDocxText(buffer: Buffer): Promise<ExtractedText> {
  const warnings: ExtractionWarning[] = [];

  const [rawResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
  ]);

  for (const message of rawResult.messages ?? []) {
    warnings.push({ type: message.type, message: message.message });
  }
  for (const message of htmlResult.messages ?? []) {
    warnings.push({ type: message.type, message: message.message });
  }

  return {
    text: normalizeWhitespace(rawResult.value ?? ""),
    richText: htmlResult.value ?? undefined,
    warnings,
  };
}

async function extractPdfText(buffer: Buffer): Promise<ExtractedText> {
  const options: PDFExtractOptions = {
    normalizeWhitespace: true,
  };

  const data = await pdfExtract.extractBuffer(buffer, options);
  const warnings: ExtractionWarning[] = [];

  const pagesText = data.pages
    .map((page) => page.content.map((item) => item.str).join(" "))
    .map((pageText) => normalizeWhitespace(pageText))
    .filter((pageText) => Boolean(pageText));

  return {
    text: pagesText.join("\n\n").trim(),
    warnings,
  };
}

function extractPlainText(buffer: Buffer): ExtractedText {
  return {
    text: normalizeWhitespace(buffer.toString("utf-8")),
    warnings: [],
  };
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
