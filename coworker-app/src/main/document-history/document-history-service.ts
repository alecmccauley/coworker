import { createId } from "@paralleldrive/cuid2";
import { desc, and, eq } from "drizzle-orm";
import { getCurrentDatabase, getCurrentWorkspace } from "../workspace";
import {
  documentVersions,
  type DocumentVersion,
  type NewDocumentVersion,
} from "../database";
import { addBlob, readBlob } from "../blob";
import { updateMessage } from "../message";
import { parseDocumentMetadata } from "../chat";
import { getMessageById } from "../message";

export interface AddDocumentVersionInput {
  messageId: string;
  blobId: string;
  commitMessage: string;
  authorType: "user" | "coworker" | "system";
  authorId?: string | null;
}

export async function addDocumentVersion(
  input: AddDocumentVersionInput,
): Promise<DocumentVersion> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const now = new Date();
  const version: NewDocumentVersion = {
    id: createId(),
    workspaceId: workspace.manifest.id,
    messageId: input.messageId,
    blobId: input.blobId,
    commitMessage: input.commitMessage,
    authorType: input.authorType,
    authorId: input.authorId ?? null,
    createdAt: now,
  };

  db.insert(documentVersions).values(version).run();

  const result = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.id, version.id));

  return result[0];
}

export async function listDocumentVersions(
  messageId: string,
): Promise<DocumentVersion[]> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  return db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.workspaceId, workspace.manifest.id),
        eq(documentVersions.messageId, messageId),
      ),
    )
    .orderBy(desc(documentVersions.createdAt))
    .all();
}

export async function getDocumentVersionById(
  versionId: string,
): Promise<DocumentVersion | null> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const result = await db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.workspaceId, workspace.manifest.id),
        eq(documentVersions.id, versionId),
      ),
    );

  return result[0] ?? null;
}

export async function getDocumentVersionContent(
  versionId: string,
): Promise<string | null> {
  const version = await getDocumentVersionById(versionId);
  if (!version) return null;
  const blob = await readBlob(version.blobId);
  if (!blob) return null;
  return blob.toString("utf-8");
}

export async function revertDocumentVersion(input: {
  messageId: string;
  versionId: string;
  commitMessage: string;
  authorType: "user" | "coworker" | "system";
  authorId?: string | null;
}): Promise<DocumentVersion> {
  const version = await getDocumentVersionById(input.versionId);
  if (!version) {
    throw new Error("Version not found");
  }

  const blob = await readBlob(version.blobId);
  if (!blob) {
    throw new Error("Version content not found");
  }

  const content = blob.toString("utf-8");
  const current = await getMessageById(input.messageId);
  const metadata = parseDocumentMetadata(current?.contentShort ?? null);
  const title = metadata?.title ?? "Document";
  const filename = `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)}.md`;

  const { blob: newBlob } = await addBlob({
    data: content,
    mime: "text/markdown",
    filename,
  });

  const updatedContentShort = JSON.stringify({
    _type: "document",
    coworkerId: metadata?.coworkerId ?? null,
    title,
    blobId: newBlob.id,
  });

  await updateMessage(input.messageId, { contentShort: updatedContentShort });

  return addDocumentVersion({
    messageId: input.messageId,
    blobId: newBlob.id,
    commitMessage: input.commitMessage,
    authorType: input.authorType,
    authorId: input.authorId ?? null,
  });
}
