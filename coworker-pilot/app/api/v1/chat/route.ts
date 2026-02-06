import { NextResponse } from "next/server";
import { streamText } from "ai";
import {
  chatCompletionRequestSchema,
  type ChatCompletionRequest,
} from "@coworker/shared-services";
import {
  errorResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "openai/gpt-4.1";

function buildContextBlock(request: ChatCompletionRequest): string {
  if (!request.ragContext || request.ragContext.length === 0) {
    return request.systemPrompt.trim();
  }

  const contextLines = request.ragContext.map((item) => {
    const scopeLabel = item.scopeId
      ? `${item.scopeType}:${item.scopeId}`
      : item.scopeType;
    return `[${scopeLabel}] ${item.sourceName}\n${item.text}`;
  });

  return [
    request.systemPrompt.trim(),
    "",
    "Context (Untrusted):",
    ...contextLines,
  ].join("\n");
}

async function handlePost(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse([
      { path: ["body"], message: "Invalid JSON body", code: "custom" },
    ]);
  }

  const result = chatCompletionRequestSchema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse(result.error.issues);
  }

  const data = result.data as ChatCompletionRequest;
  const modelName = data.model ?? process.env.AI_MODEL ?? DEFAULT_MODEL;

  try {
    const finalSystemPrompt = buildContextBlock(data);
    const aiResult = await streamText({
      model: modelName,
      messages: [
        { role: "system", content: finalSystemPrompt },
        ...data.messages,
      ],
      temperature: data.temperature ?? 0.2,
      maxTokens: data.maxTokens,
    });

    return aiResult.toUIMessageStreamResponse() as NextResponse;
  } catch (error) {
    console.error("[Chat] Streaming error:", error);
    return errorResponse("Failed to stream chat response", 500);
  }
}

export const POST = withAuth(handlePost);
