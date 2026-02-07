import type { ApiClient } from "../client.js";
import type {
  AiModel,
  AiModelPublic,
  CreateAiModelInput,
  UpdateAiModelInput,
} from "../../types/domain/model.js";
import {
  createAiModelSchema,
  updateAiModelSchema,
  aiModelIdParamSchema,
} from "../../schemas/model.js";
import { parseWithSchema } from "../validation.js";

export class ModelsEndpoint {
  constructor(private readonly client: ApiClient) {}

  async list(): Promise<AiModelPublic[]> {
    return this.client.get<AiModelPublic[]>("/api/v1/models");
  }

  async adminList(): Promise<AiModel[]> {
    return this.client.get<AiModel[]>("/api/v1/admin/models");
  }

  async adminGetById(id: string): Promise<AiModel> {
    const parsed = parseWithSchema(aiModelIdParamSchema, { id });
    return this.client.get<AiModel>(`/api/v1/admin/models/${parsed.id}`);
  }

  async create(data: CreateAiModelInput): Promise<AiModel> {
    const parsed = parseWithSchema(createAiModelSchema, data);
    return this.client.post<AiModel>("/api/v1/admin/models", parsed);
  }

  async update(id: string, data: UpdateAiModelInput): Promise<AiModel> {
    const parsedParams = parseWithSchema(aiModelIdParamSchema, { id });
    const parsedBody = parseWithSchema(updateAiModelSchema, data);
    return this.client.patch<AiModel>(
      `/api/v1/admin/models/${parsedParams.id}`,
      parsedBody,
    );
  }

  async delete(id: string): Promise<void> {
    const parsed = parseWithSchema(aiModelIdParamSchema, { id });
    await this.client.delete<unknown>(`/api/v1/admin/models/${parsed.id}`);
  }
}
