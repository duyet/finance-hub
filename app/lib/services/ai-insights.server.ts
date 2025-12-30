/**
 * AI Insights Service
 *
 * Provides AI-powered financial insights using Cloudflare Workers AI.
 * Uses Llama 3.1 8B for all AI operations (free tier on Cloudflare).
 */

import type { CloudflareRequest } from "~/lib/auth/db.server";

// AI binding type with run method (Cloudflare Workers AI)
interface AiBinding {
  run(model: string, inputs: unknown, options?: Record<string, unknown>): Promise<unknown>;
}

type AIGatewayOptions = Record<string, unknown>;

export interface FinancialQuestion {
  question: string;
  context?: {
    period?: string;
    category?: string;
    accountId?: string;
  };
}

/**
 * Answer financial question using Cloudflare Workers AI (Llama 3.1 8B)
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
  const workersAI = env?.AI;

  if (!workersAI) {
    return "AI assistant is currently unavailable. Please try again later.";
  }

  const prompt = buildQuestionPrompt(question, userContext);
  const systemPrompt = "You are a helpful financial assistant. Answer questions about personal finance clearly and accurately. If you don't have enough information, ask for clarification.";

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

    const answer = (response as { response?: string; text?: string }).response ||
                   (response as { response?: string; text?: string }).text || "";
    return answer;
  } catch (error) {
    console.error("Workers AI failed:", error);
    return "I'm having trouble processing your question right now. Please try again later.";
  }
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
