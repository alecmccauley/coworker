/**
 * Author types for messages
 */
export type AuthorType = "user" | "coworker" | "system";

/**
 * Message status
 */
export type MessageStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "error"
  | "suppressed";

/**
 * A message entity in the workspace
 */
export interface Message {
  id: string;
  workspaceId: string;
  threadId: string;
  replyToMessageId: string | null;
  authorType: string;
  authorId: string | null;
  contentRef: string | null;
  contentShort: string | null;
  status: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a message
 */
export interface CreateMessageInput {
  threadId: string;
  authorType: AuthorType;
  authorId?: string;
  replyToMessageId?: string;
  contentShort?: string;
  contentRef?: string;
  status?: MessageStatus;
}

/**
 * Input for updating a message
 */
export interface UpdateMessageInput {
  contentShort?: string;
  contentRef?: string;
  status?: MessageStatus;
}
