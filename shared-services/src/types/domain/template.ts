import type { BaseEntity } from "../crud.js";

/**
 * Default behaviors configuration for a coworker template
 */
export interface CoworkerDefaultBehaviors {
  tone?: string;
  formatting?: string;
  guardrails?: string[];
}

/**
 * Tools policy configuration for a coworker template
 */
export interface CoworkerToolsPolicy {
  allowedCategories?: string[];
  disallowedTools?: string[];
}

/**
 * Model routing policy configuration (internal, not exposed to users)
 */
export interface CoworkerModelRoutingPolicy {
  preferredModel?: string;
  fallbackModel?: string;
  maxTokens?: number;
}

/**
 * Coworker template entity - centrally managed role templates
 */
export interface CoworkerTemplate extends BaseEntity {
  slug: string;
  name: string;
  description: string | null;
  rolePrompt: string;
  defaultBehaviorsJson: string | null;
  defaultToolsPolicyJson: string | null;
  modelRoutingPolicyJson: string | null;
  version: number;
  isPublished: boolean;
}

/**
 * Coworker template with parsed JSON fields
 */
export interface CoworkerTemplateExpanded extends Omit<
  CoworkerTemplate,
  "defaultBehaviorsJson" | "defaultToolsPolicyJson" | "modelRoutingPolicyJson"
> {
  defaultBehaviors: CoworkerDefaultBehaviors | null;
  defaultToolsPolicy: CoworkerToolsPolicy | null;
  modelRoutingPolicy: CoworkerModelRoutingPolicy | null;
}

/**
 * Public template view (excludes internal routing policy)
 */
export interface CoworkerTemplatePublic {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rolePrompt: string;
  defaultBehaviors: CoworkerDefaultBehaviors | null;
  defaultToolsPolicy: CoworkerToolsPolicy | null;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Input for creating a new coworker template
 */
export interface CreateCoworkerTemplateInput {
  slug: string;
  name: string;
  description?: string;
  rolePrompt: string;
  defaultBehaviors?: CoworkerDefaultBehaviors;
  defaultToolsPolicy?: CoworkerToolsPolicy;
  modelRoutingPolicy?: CoworkerModelRoutingPolicy;
  isPublished?: boolean;
}

/**
 * Input for updating an existing coworker template
 */
export interface UpdateCoworkerTemplateInput {
  slug?: string;
  name?: string;
  description?: string | null;
  rolePrompt?: string;
  defaultBehaviors?: CoworkerDefaultBehaviors | null;
  defaultToolsPolicy?: CoworkerToolsPolicy | null;
  modelRoutingPolicy?: CoworkerModelRoutingPolicy | null;
  isPublished?: boolean;
}

/**
 * Template version check response
 */
export interface TemplateVersionInfo {
  latestVersion: number;
  templateCount: number;
  lastUpdated: Date | string;
}
