/**
 * AI Insights Service
 *
 * Provides AI-powered financial insights using multiple AI providers.
 * Provider preference: OpenRouter free models → Workers AI → OpenRouter premium
 *
 * Uses Cloudflare AI Gateway for observability, caching, and cost optimization.
 *
 * @see PRD - AI-powered insights and recommendations
 */

import type { CloudflareRequest } from "~/lib/auth/db.server";
import { generateWithFreeModel, generateWithFallback } from "./openrouter.server";

// ============================================================================
// Types
// ============================================================================

// AI binding type with run method (Cloudflare Workers AI)
interface AiBinding {
  run(model: string, inputs: unknown, options?: Record<string, unknown>): Promise<unknown>;
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

type AIGatewayOptions = Record<string, unknown>;

export interface TransactionAnalysis {
  summary: string;
  topCategories: Array<{ category: string; amount: number; percentage: number }>;
  trends: string[];
  recommendations: string[];
}

export interface FinancialQuestion {
  question: string;
  context?: {
    period?: string;
    category?: string;
    accountId?: string;
  };
}

export interface InsightRequest {
  type: "spending_analysis" | "budget_advice" | "anomaly_detection" | "question";
  data?: Record<string, unknown>;
  question?: string;
  userId: string;
}

// ============================================================================
// AI Insight Generation
// ============================================================================

/**
 * Generate spending analysis using AI
 *
 * Provider strategy:
 * 1. OpenRouter free models (Llama 3 8B, Gemma 2 9B) - no cost
 * 2. Workers AI (Llama 3.1 8B) - free tier on Cloudflare
 * 3. OpenRouter premium models (GPT-4o, Claude) - paid fallback
 */
export async function generateSpendingAnalysis(
  request: CloudflareRequest,
  transactionData: {
    totalSpent: number;
    topCategories: Array<{ name: string; amount: number; count: number }>;
    period: string;
    currency: string;
  }
): Promise<TransactionAnalysis> {
  const env = request.context?.cloudflare?.env;
  const openRouterToken = env?.OPENROUTER_API_TOKEN as string;
  const workersAI = env?.AI;

  // Build analysis prompt
  const prompt = buildAnalysisPrompt(transactionData);
  const systemPrompt = "You are a financial advisor assistant. Analyze spending data and provide clear, actionable insights. Keep responses concise and practical.";

  let text = "";

  // Strategy 1: Try OpenRouter free models first (if token available)
  if (openRouterToken) {
    try {
      text = await generateWithFreeModel(request, systemPrompt, prompt, { maxTokens: 1024 });
      return parseAnalysisResponse(text, transactionData);
    } catch (error) {
      console.warn("OpenRouter free model failed, trying Workers AI:", error);
    }
  }

  // Strategy 2: Fallback to Workers AI (Llama 3.1 8B)
  if (workersAI) {
    try {
      const gatewayId = env?.AI_GATEWAY_ID;
      const gatewayOptions: AIGatewayOptions = gatewayId ? { gateway: { id: gatewayId } } : {};
      const ai = workersAI as unknown as AiBinding;

      const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 1024,
      }, gatewayOptions);

      text = (response as { response?: string; text?: string }).response ||
             (response as { response?: string; text?: string }).text || "";
      return parseAnalysisResponse(text, transactionData);
    } catch (error) {
      console.warn("Workers AI failed, trying OpenRouter premium:", error);
    }
  }

  // Strategy 3: Fallback to OpenRouter premium models (if token available)
  if (openRouterToken) {
    try {
      text = await generateWithFallback(request, systemPrompt, prompt, { maxTokens: 1024 });
      return parseAnalysisResponse(text, transactionData);
    } catch (error) {
      console.error("All AI providers failed:", error);
    }
  }

  // Final fallback: Basic analysis without AI
  console.warn("All AI providers unavailable, using basic analysis");
  return generateBasicAnalysis(transactionData);
}

/**
 * Answer financial question using AI
 *
 * Provider strategy:
 * 1. OpenRouter free models (Llama 3 8B, Gemma 2 9B) - no cost
 * 2. Workers AI (Llama 3.1 8B) - free tier on Cloudflare
 * 3. OpenRouter premium models (GPT-4o, Claude) - paid fallback
 */
export async function answerFinancialQuestion(
  request: CloudflareRequest,
  question: FinancialQuestion,
  userContext: {
    recentTransactions: Array<{ date: string; amount: number; category: string; description: string }>;
    accounts: Array<{ name: string; type: string; balance: number }>;
  }
): Promise<string> {
  const env = request.context?.cloudflare?.env;
  const openRouterToken = env?.OPENROUTER_API_TOKEN as string;
  const workersAI = env?.AI;

  // Build context-aware prompt
  const prompt = buildQuestionPrompt(question, userContext);
  const systemPrompt = "You are a helpful financial assistant. Answer questions about personal finance clearly and accurately. If you don't have enough information, ask for clarification.";

  let answer = "";

  // Strategy 1: Try OpenRouter free models first
  if (openRouterToken) {
    try {
      answer = await generateWithFreeModel(request, systemPrompt, prompt, { maxTokens: 512 });
      return answer;
    } catch (error) {
      console.warn("OpenRouter free model failed, trying Workers AI:", error);
    }
  }

  // Strategy 2: Fallback to Workers AI
  if (workersAI) {
    try {
      const gatewayId = env?.AI_GATEWAY_ID;
      const gatewayOptions: AIGatewayOptions = gatewayId ? { gateway: { id: gatewayId } } : {};
      const ai = workersAI as unknown as AiBinding;

      const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 512,
      }, gatewayOptions);

      answer = (response as { response?: string; text?: string }).response ||
               (response as { response?: string; text?: string }).text || "";
      return answer;
    } catch (error) {
      console.warn("Workers AI failed, trying OpenRouter premium:", error);
    }
  }

  // Strategy 3: Fallback to OpenRouter premium models
  if (openRouterToken) {
    try {
      answer = await generateWithFallback(request, systemPrompt, prompt, { maxTokens: 512 });
      return answer;
    } catch (error) {
      console.error("All AI providers failed:", error);
    }
  }

  // Final fallback
  return "I'm having trouble processing your question right now. Please try again later.";
}

/**
 * Detect spending anomalies using AI
 */
export async function detectAnomalies(
  request: CloudflareRequest,
  transactions: Array<{ date: string; amount: number; category: string; description: string }>
): Promise<Array<{ transaction: typeof transactions[0]; reason: string; severity: "low" | "medium" | "high" }>> {
  const aiBinding = request.context?.cloudflare?.env?.AI;

  if (!aiBinding) {
    return [];
  }

  // Group recent transactions for analysis
  const recentTransactions = transactions.slice(0, 20);
  const prompt = buildAnomalyPrompt(recentTransactions);

  try {
    const gatewayId = request.context?.cloudflare?.env?.AI_GATEWAY_ID;
    const gatewayOptions: AIGatewayOptions = gatewayId ? { gateway: { id: gatewayId } } : {};
    const ai = aiBinding as unknown as AiBinding;

    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: "You are a fraud detection assistant. Identify unusual spending patterns. Return results as JSON array with transaction index, reason, and severity (low/medium/high).",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 512,
    }, gatewayOptions);

    const text = (response as { response?: string; text?: string }).response ||
                 (response as { response?: string; text?: string }).text || "";
    return parseAnomalyResponse(text, recentTransactions);
  } catch (error) {
    console.error("AI anomaly detection failed:", error);
    return [];
  }
}

// ============================================================================
// Prompt Builders
// ============================================================================

function buildAnalysisPrompt(data: {
  totalSpent: number;
  topCategories: Array<{ name: string; amount: number; count: number }>;
  period: string;
  currency: string;
}): string {
  const categoriesText = data.topCategories
    .map((c, i) => `${i + 1}. ${c.name}: ${data.currency} ${c.amount.toFixed(2)} (${c.count} transactions)`)
    .join("\n");

  return `Analyze this spending data for the period ${data.period}:

Total Spent: ${data.currency} ${data.totalSpent.toFixed(2)}

Top Categories:
${categoriesText}

Please provide:
1. A brief summary (2-3 sentences)
2. Main trends you notice (2-3 bullet points)
3. Actionable recommendations (2-3 bullet points)`;
}

function buildQuestionPrompt(question: FinancialQuestion, context: {
  recentTransactions: Array<{ date: string; amount: number; category: string; description: string }>;
  accounts: Array<{ name: string; type: string; balance: number }>;
}): string {
  const contextText = `
Recent Transactions (last 10):
${context.recentTransactions.slice(0, 10).map(t => `- ${t.date}: ${t.description} (${t.category}) ${t.amount}`).join("\n")}

Accounts:
${context.accounts.map(a => `- ${a.name} (${a.type}): ${a.balance}`).join("\n")}
`;

  return `${contextText}

User Question: ${question.question}

Please provide a helpful, accurate answer based on this context.`;
}

function buildAnomalyPrompt(transactions: Array<{ date: string; amount: number; category: string; description: string }>): string {
  return `Review these recent transactions for potential fraud or unusual spending:

${transactions.map((t, i) => `${i + 1}. ${t.date}: ${t.description} - ${t.amount} (${t.category})`).join("\n")}

Identify any suspicious or unusual transactions. Consider:
- Unusually high amounts for the category
- New or unknown merchants
- Patterns that don't match typical behavior

Return as JSON: [{"index": 0, "reason": "why suspicious", "severity": "medium"}]`;
}

// ============================================================================
// Response Parsers
// ============================================================================

function parseAnalysisResponse(text: string, data: {
  totalSpent: number;
  topCategories: Array<{ name: string; amount: number; count: number }>;
  period: string;
  currency: string;
}): TransactionAnalysis {
  // Extract sections from AI response
  const summaryMatch = text.match(/summary:?\s*(.+?)(?=\n\n|\n[0-9]|$)/is);
  const trendsMatch = text.match(/trends?:?\s*(.+?)(?=\n\n|recommendations:|$)/is);
  const recommendationsMatch = text.match(/recommendations?:?\s*(.+?)$/is);

  const summary = summaryMatch?.[1]?.trim() || `Spent ${data.currency} ${data.totalSpent.toFixed(2)} in ${data.period}.`;

  const trends = trendsMatch?.[1]?.split("\n")
    .map(line => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean) || [];

  const recommendations = recommendationsMatch?.[1]?.split("\n")
    .map(line => line.replace(/^[-•*]\s*\d*\.?\s*/, "").trim())
    .filter(Boolean) || [];

  // Calculate percentages for top categories
  const totalSpent = data.totalSpent || 1;
  const topCategories = data.topCategories.map(cat => ({
    category: cat.name,
    amount: cat.amount,
    percentage: Math.round((cat.amount / totalSpent) * 100),
  }));

  return { summary, topCategories, trends, recommendations };
}

function parseAnomalyResponse(text: string, transactions: Array<{ date: string; amount: number; category: string; description: string }>): Array<{ transaction: typeof transactions[0]; reason: string; severity: "low" | "medium" | "high" }> {
  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item: { index?: number; reason?: string }) => item.index !== undefined && item.reason)
          .map((item: { index: number; reason: string; severity?: "low" | "medium" | "high" }) => ({
            transaction: transactions[item.index] || transactions[0],
            reason: item.reason,
            severity: item.severity || "medium",
          }));
      }
    }
  } catch (error) {
    console.error("Failed to parse anomaly response:", error);
  }
  return [];
}

function generateBasicAnalysis(data: {
  totalSpent: number;
  topCategories: Array<{ name: string; amount: number; count: number }>;
  period: string;
  currency: string;
}): TransactionAnalysis {
  const totalSpent = data.totalSpent || 1;
  const topCategories = data.topCategories.map(cat => ({
    category: cat.name,
    amount: cat.amount,
    percentage: Math.round((cat.amount / totalSpent) * 100),
  }));

  const topCategory = topCategories[0];
  const summary = `You spent ${data.currency} ${data.totalSpent.toFixed(2)} in ${data.period}. ` +
    `Your highest expense category was ${topCategory?.category || "general"} at ${topCategory?.percentage || 0}% of total spending.`;

  const trends = [
    `${topCategory?.category || "Main category"} accounts for ${data.currency} ${topCategory?.amount.toFixed(2) || 0}`,
  ];

  const recommendations = [
    "Review your spending in your top category to see if there are opportunities to save.",
    "Consider setting a budget for your highest expense category.",
  ];

  return { summary, topCategories, trends, recommendations };
}
