/**
 * AI Insights Service
 *
 * Provides AI-powered financial insights using Cloudflare Workers AI.
 * Generates intelligent analysis of spending patterns, recommendations,
 * and answers natural language questions about finances.
 *
 * Uses Cloudflare AI Gateway for observability, caching, and cost optimization.
 *
 * @see PRD - AI-powered insights and recommendations
 */

import type { CloudflareRequest } from "~/lib/auth/db.server";

// ============================================================================
// Types
// ============================================================================

interface AIGatewayOptions {
  gateway?: {
    id: string;
    skipCache?: boolean;
  };
}

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
  const ai = request.context?.cloudflare?.env?.AI;

  if (!ai) {
    throw new Error("AI binding not available");
  }

  // Build analysis prompt
  const prompt = buildAnalysisPrompt(transactionData);

  try {
    // Use Cloudflare Workers AI for analysis
    const gatewayId = request.context?.cloudflare?.env?.AI_GATEWAY_ID;
    const gatewayOptions: AIGatewayOptions = gatewayId ? { gateway: { id: gatewayId } } : {};

    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: "You are a financial advisor assistant. Analyze spending data and provide clear, actionable insights. Keep responses concise and practical.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1024,
    }, gatewayOptions as any);

    // Parse AI response
    const text = (response as any).response || (response as any).text || "";
    return parseAnalysisResponse(text, transactionData);
  } catch (error) {
    console.error("AI analysis failed:", error);
    // Fallback to basic analysis
    return generateBasicAnalysis(transactionData);
  }
}

/**
 * Answer financial question using AI
 */
export async function answerFinancialQuestion(
  request: CloudflareRequest,
  question: FinancialQuestion,
  userContext: {
    recentTransactions: Array<{ date: string; amount: number; category: string; description: string }>;
    accounts: Array<{ name: string; type: string; balance: number }>;
  }
): Promise<string> {
  const ai = request.context?.cloudflare?.env?.AI;

  if (!ai) {
    throw new Error("AI binding not available");
  }

  // Build context-aware prompt
  const prompt = buildQuestionPrompt(question, userContext);

  try {
    const gatewayId = request.context?.cloudflare?.env?.AI_GATEWAY_ID;
    const gatewayOptions: AIGatewayOptions = gatewayId ? { gateway: { id: gatewayId } } : {};

    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: "You are a helpful financial assistant. Answer questions about personal finance clearly and accurately. If you don't have enough information, ask for clarification.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 512,
    }, gatewayOptions as any);

    return (response as any).response || (response as any).text || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("AI question answering failed:", error);
    return "I'm having trouble processing your question right now. Please try again later.";
  }
}

/**
 * Detect spending anomalies using AI
 */
export async function detectAnomalies(
  request: CloudflareRequest,
  transactions: Array<{ date: string; amount: number; category: string; description: string }>
): Promise<Array<{ transaction: typeof transactions[0]; reason: string; severity: "low" | "medium" | "high" }>> {
  const ai = request.context?.cloudflare?.env?.AI;

  if (!ai) {
    return [];
  }

  // Group recent transactions for analysis
  const recentTransactions = transactions.slice(0, 20);
  const prompt = buildAnomalyPrompt(recentTransactions);

  try {
    const gatewayId = request.context?.cloudflare?.env?.AI_GATEWAY_ID;
    const gatewayOptions: AIGatewayOptions = gatewayId ? { gateway: { id: gatewayId } } : {};

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
    }, gatewayOptions as any);

    const text = (response as any).response || (response as any).text || "";
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
          .filter((item: any) => item.index !== undefined && item.reason)
          .map((item: any) => ({
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
