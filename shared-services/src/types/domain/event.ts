import type { BaseEntity } from "../crud.js";

export interface Event extends BaseEntity {
  type: string;
  userId: string | null;
  details: Record<string, unknown> | null;
}

export interface SignInEventDetails {
  email: string;
  name: string | null;
  authCodeId: string;
  attempts: number;
}

export interface WorkspaceCreatedEventDetails {
  workspaceName: string;
}
