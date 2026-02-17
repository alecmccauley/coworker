export interface ToolErrorData {
  _type: "tool_error";
  toolName: string;
  error: string;
}

export function parseToolErrorData(
  contentShort: string | null | undefined,
): ToolErrorData | null {
  if (!contentShort) return null;
  try {
    const parsed = JSON.parse(contentShort) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "_type" in parsed &&
      (parsed as ToolErrorData)._type === "tool_error"
    ) {
      return parsed as ToolErrorData;
    }
  } catch {
    // Not JSON or not tool error data
  }
  return null;
}
