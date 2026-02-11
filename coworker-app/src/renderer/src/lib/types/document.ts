export interface DocumentData {
  _type: "document";
  coworkerId: string;
  title: string;
  blobId?: string;
}

export function parseDocumentData(
  contentShort: string | null | undefined,
): DocumentData | null {
  if (!contentShort) return null;
  try {
    const parsed = JSON.parse(contentShort) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "_type" in parsed &&
      (parsed as DocumentData)._type === "document"
    ) {
      return parsed as DocumentData;
    }
  } catch {
    // Not JSON or not document data
  }
  return null;
}
