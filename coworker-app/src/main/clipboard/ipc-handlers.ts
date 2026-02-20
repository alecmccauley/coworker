import { clipboard, ipcMain } from "electron";

interface WriteRichClipboardInput {
  html: string;
  text: string;
}

function assertWriteRichClipboardInput(
  input: unknown,
): asserts input is WriteRichClipboardInput {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid clipboard payload.");
  }

  const payload = input as Partial<WriteRichClipboardInput>;
  if (typeof payload.html !== "string" || typeof payload.text !== "string") {
    throw new Error("Clipboard payload requires html and text strings.");
  }
}

export function registerClipboardIpcHandlers(): void {
  ipcMain.handle("clipboard:writeRich", async (_event, input: unknown) => {
    assertWriteRichClipboardInput(input);
    clipboard.write({
      html: input.html,
      text: input.text,
    });
  });

  ipcMain.handle("clipboard:writeText", async (_event, text: unknown) => {
    if (typeof text !== "string") {
      throw new Error("Clipboard text payload must be a string.");
    }
    clipboard.writeText(text);
  });
}
