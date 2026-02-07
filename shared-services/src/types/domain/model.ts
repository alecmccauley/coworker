import type { BaseEntity } from "../crud.js";

export interface AiModel extends BaseEntity {
  title: string;
  value: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface AiModelPublic {
  id: string;
  title: string;
  value: string;
  isDefault: boolean;
}

export interface CreateAiModelInput {
  title: string;
  value: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateAiModelInput {
  title?: string;
  value?: string;
  isActive?: boolean;
  isDefault?: boolean;
}
