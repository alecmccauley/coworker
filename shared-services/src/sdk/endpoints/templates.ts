import type { ApiClient } from "../client.js";
import type {
  CoworkerTemplatePublic,
  CreateCoworkerTemplateInput,
  UpdateCoworkerTemplateInput,
  TemplateVersionInfo,
  CoworkerTemplate,
} from "../../types/domain/template.js";
import {
  createCoworkerTemplateSchema,
  updateCoworkerTemplateSchema,
  templateIdParamSchema,
} from "../../schemas/template.js";
import { parseWithSchema } from "../validation.js";

/**
 * Templates endpoint for coworker template operations
 */
export class TemplatesEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * List all published templates (public endpoint)
   */
  async list(): Promise<CoworkerTemplatePublic[]> {
    return this.client.get<CoworkerTemplatePublic[]>("/api/v1/templates");
  }

  /**
   * Get a template by ID (public endpoint)
   */
  async getById(id: string): Promise<CoworkerTemplatePublic> {
    const parsed = parseWithSchema(templateIdParamSchema, { id });
    return this.client.get<CoworkerTemplatePublic>(`/api/v1/templates/${parsed.id}`);
  }

  /**
   * Check template version info for sync
   */
  async checkVersion(): Promise<TemplateVersionInfo> {
    return this.client.get<TemplateVersionInfo>("/api/v1/templates/version");
  }

  /**
   * Admin: List all templates (including unpublished)
   */
  async adminList(): Promise<CoworkerTemplate[]> {
    return this.client.get<CoworkerTemplate[]>("/api/v1/admin/templates");
  }

  /**
   * Admin: Get a template by ID (including unpublished)
   */
  async adminGetById(id: string): Promise<CoworkerTemplate> {
    const parsed = parseWithSchema(templateIdParamSchema, { id });
    return this.client.get<CoworkerTemplate>(`/api/v1/admin/templates/${parsed.id}`);
  }

  /**
   * Admin: Create a new template
   */
  async create(data: CreateCoworkerTemplateInput): Promise<CoworkerTemplate> {
    const parsed = parseWithSchema(createCoworkerTemplateSchema, data);
    return this.client.post<CoworkerTemplate>("/api/v1/admin/templates", parsed);
  }

  /**
   * Admin: Update an existing template
   */
  async update(id: string, data: UpdateCoworkerTemplateInput): Promise<CoworkerTemplate> {
    const parsedParams = parseWithSchema(templateIdParamSchema, { id });
    const parsedBody = parseWithSchema(updateCoworkerTemplateSchema, data);
    return this.client.patch<CoworkerTemplate>(
      `/api/v1/admin/templates/${parsedParams.id}`,
      parsedBody
    );
  }

  /**
   * Admin: Delete a template
   */
  async delete(id: string): Promise<void> {
    const parsed = parseWithSchema(templateIdParamSchema, { id });
    await this.client.delete<unknown>(`/api/v1/admin/templates/${parsed.id}`);
  }
}
