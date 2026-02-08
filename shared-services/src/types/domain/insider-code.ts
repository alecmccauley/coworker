import type { BaseEntity } from "../crud.js";

export interface InsiderCode extends BaseEntity {
  code: string;
  title: string;
  notes: string | null;
  isActive: boolean;
}

export interface InsiderCodeWithCount extends InsiderCode {
  activationCount: number;
}

export interface InsiderActivation {
  id: string;
  insiderCodeId: string;
  userId: string;
  createdAt: Date | string;
}

export interface CreateInsiderCodeInput {
  code: string;
  title: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateInsiderCodeInput {
  code?: string;
  title?: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface InsiderSignUpInput {
  code: string;
  name: string;
  email: string;
}
