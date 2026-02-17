export interface RichClipboardContent {
  html: string;
  text: string;
}

export function htmlToPlainText(html: string): string {
  if (!html) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent?.trim() ?? "";
}

export async function copyRichContent(
  content: RichClipboardContent,
): Promise<boolean> {
  const html = content.html.trim();
  const text = content.text.trim();

  if (!html || !text) return false;

  try {
    await window.api.clipboard.writeRich({ html, text });
    return true;
  } catch (error) {
    console.error("Failed to copy rich content:", error);
    return false;
  }
}
