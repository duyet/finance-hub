/**
 * OpenRouter AI Service
 *
 * Provides access to multiple AI models through OpenRouter API.
 * Routed through Cloudflare AI Gateway for observability and caching.
 *
 * Model Selection Strategy:
 * - Free models first (google/gemma-2-9b-it:free, meta-llama/llama-3-8b-instruct:free)
 * - Premium models as fallback (openai/gpt-4o-mini, anthropic/claude-3-haiku)
 *
 * @see https://developers.cloudflare.com/ai-gateway/usage/providers/openrouter/
 */

import type { CloudflareRequest } from "../auth/db.server";

// ============================================================================
// Types
// ============================================================================

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  useFreeModel?: boolean;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Model configurations
const FREE_MODELS = {
  gemma: "google/gemma-2-9b-it:free",
  llama: "meta-llama/llama-3-8b-instruct:free",
} as const;

const PREMIUM_MODELS = {
  gpt4o: "openai/gpt-4o-mini",
  claude: "anthropic/claude-3-haiku",
} as const;

const DEFAULT_FREE_MODEL = FREE_MODELS.llama;
const DEFAULT_PREMIUM_MODEL = PREMIUM_MODELS.gpt4o;

// ============================================================================
// OpenRouter Client
// ============================================================================

/**
 * Get OpenRouter API configuration from environment
 */
function getOpenRouterConfig(request: CloudflareRequest): {
  token: string | undefined;
  gatewayURL: string | undefined;
} {
  const env = request.context?.cloudflare?.env;

  // OpenRouter API token (required for OpenRouter)
  const token = env?.OPENROUTER_API_TOKEN as string;

  // Cloudflare AI Gateway URL (optional, for observability)
  const accountId = env?.CLOUDFLARE_ACCOUNT_ID as string;
  const gatewayName = env?.AI_GATEWAY_NAME as string;

  const gatewayURL = accountId && gatewayName
    ? `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayName}/openrouter`
    : undefined;

  return { token, gatewayURL };
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(
  request: CloudflareRequest,
  messages: OpenRouterMessage[],
  options: OpenRouterOptions = {}
): Promise<OpenRouterResponse> {
  const { token, gatewayURL } = getOpenRouterConfig(request);

  if (!token) {
    throw new Error("OpenRouter API token not configured. Set OPENROUTER_API_TOKEN environment variable.");
  }

  // Select model based on preferences
  const model = options.model || (options.useFreeModel !== false ? DEFAULT_FREE_MODEL : DEFAULT_PREMIUM_MODEL);

  // Use AI Gateway URL if configured, otherwise direct to OpenRouter
  const baseURL = gatewayURL || "https://openrouter.ai/api/v1";
  const url = `${baseURL}/chat/completions`;

  const body = {
    model,
    messages,
    max_tokens: options.maxTokens || 512,
    temperature: options.temperature || 0.7,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "HTTP-Referer": "https://finance-hub.duyet.dev",
      "X-Title": "Finance Hub",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json() as Promise<OpenRouterResponse>;
}

// ============================================================================
// AI Functions
// ============================================================================

/**
 * Generate AI response using free models first
 */
export async function generateWithFreeModel(
  request: CloudflareRequest,
  systemPrompt: string,
  userPrompt: string,
  options: OpenRouterOptions = {}
): Promise<string> {
  const messages: OpenRouterMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // Prefer free models
  const response = await callOpenRouter(request, messages, {
    ...options,
    useFreeModel: true,
  });

  return response.choices[0]?.message?.content || "No response generated.";
}

/**
 * Generate AI response with premium model fallback
 */
export async function generateWithFallback(
  request: CloudflareRequest,
  systemPrompt: string,
  userPrompt: string,
  options: OpenRouterOptions = {}
): Promise<string> {
  const messages: OpenRouterMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    // Try free model first
    return await generateWithFreeModel(request, systemPrompt, userPrompt, options);
  } catch (error) {
    console.error("Free model failed, trying premium model:", error);

    // Fallback to premium model
    const response = await callOpenRouter(request, messages, {
      ...options,
      model: options.model || DEFAULT_PREMIUM_MODEL,
    });

    return response.choices[0]?.message?.content || "No response generated.";
  }
}

/**
 * Get available free models
 */
export function getAvailableFreeModels(): Array<{ id: string; name: string }> {
  return [
    { id: FREE_MODELS.gemma, name: "Google Gemma 2 9B (Free)" },
    { id: FREE_MODELS.llama, name: "Meta Llama 3 8B (Free)" },
  ];
}

/**
 * Get available premium models
 */
export function getAvailablePremiumModels(): Array<{ id: string; name: string }> {
  return [
    { id: PREMIUM_MODELS.gpt4o, name: "OpenAI GPT-4o Mini" },
    { id: PREMIUM_MODELS.claude, name: "Anthropic Claude 3 Haiku" },
  ];
}
