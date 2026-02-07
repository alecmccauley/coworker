import { NextResponse } from "next/server";
import { streamText } from "ai";
import { z } from "zod";
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
  const activityInstruction = [
    "Use report_status to share short, user-safe activity updates (no internal reasoning).",
    "Never reveal chain-of-thought or internal reasoning.",
    "Keep labels concise and conversational.",
  ].join("\n");

  const systemPrompt = [request.systemPrompt.trim(), "", activityInstruction].join(
    "\n",
  );

  if (!request.ragContext || request.ragContext.length === 0) {
    return systemPrompt;
  }

  const contextLines = request.ragContext.map((item) => {
    const scopeLabel = item.scopeId
      ? `${item.scopeType}:${item.scopeId}`
      : item.scopeType;
    return `[${scopeLabel}] ${item.sourceName}\n${item.text}`;
  });

  return [systemPrompt, "", "Context (Untrusted):", ...contextLines].join("\n");
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
      tools: {
        report_status: {
          description:
            "Share short, user-safe activity updates during generation. Do not reveal internal reasoning.",
          inputSchema: z.object({
            label: z.string().min(1).max(120),
          }),
          execute: async () => ({ ok: true }),
        },
      },
    });

    return aiResult.toUIMessageStreamResponse() as NextResponse;
  } catch (error) {
    console.error("[Chat] Streaming error:", error);
    return errorResponse("Failed to stream chat response", 500);
  }
}

export const POST = withAuth(handlePost);
