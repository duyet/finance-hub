/**
 * Financial Insights Chat Component
 *
 * AI-powered chat interface for financial questions and insights.
 * Uses Cloudflare Workers AI to provide intelligent responses.
 */

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { Spinner } from "~/components/ui/loading";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatProps {
  userId: string;
  initialContext?: {
    recentTransactions?: Array<{ date: string; amount: number; category: string; description: string }>;
    accounts?: Array<{ name: string; type: string; balance: number }>;
  };
}

export function FinancialInsightsChat({ userId, initialContext }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your financial assistant. You can ask me about spending patterns, budget advice, or try one of the quick questions below.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    "What's my biggest expense category?",
    "How much did I spend last month?",
    "Am I spending more than usual?",
    "Give me a budget tip",
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (questionText?: string) => {
    const messageText = questionText || input;
    if (!messageText?.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!questionText) setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage.content,
          context: initialContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json() as { answer?: string };

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || "I'm sorry, I couldn't process that question.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendClick = () => handleSend();

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
        <Sparkles className="h-5 w-5 text-blue-600" aria-hidden="true" />
        <h3 className="font-semibold" id="chat-heading">Financial Insights</h3>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Chat messages"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
              role={message.role === "assistant" ? "status" : undefined}
              aria-label={`${message.role === "user" ? "You" : "Assistant"} message`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs opacity-70 mt-1 block" aria-hidden="true">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start" role="status" aria-live="polite" aria-label="Assistant is typing">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <Spinner size="sm" />
              <span className="sr-only">Assistant is typing...</span>
            </div>
          </div>
        )}
        {/* Quick Questions - Show only on welcome */}
        {messages.length === 1 && !isLoading && (
          <div className="space-y-2 pt-2" role="region" aria-label="Quick question suggestions">
            <p className="text-xs text-gray-500">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={question}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSend(question);
                  }}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                  aria-label={`Ask: ${question}`}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your finances..."
            disabled={isLoading}
            className="flex-1"
            id="chat-input"
            aria-label="Type your question"
            autoComplete="off"
          />
          <Button
            onClick={handleSendClick}
            disabled={!input.trim() || isLoading}
            size="icon"
            aria-label="Send message"
            type="submit"
          >
            {isLoading ? (
              <Spinner size="sm" className="text-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Quick insight questions
 */
export function QuickInsightQuestions({
  onSelect,
}: {
  onSelect: (question: string) => void;
}) {
  const questions = [
    "What's my biggest expense category?",
    "How much did I spend last month?",
    "Am I spending more than usual?",
    "Give me a budget tip",
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 mb-2">Quick questions:</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <Button
            key={question}
            variant="outline"
            size="sm"
            onClick={(_e: React.MouseEvent) => onSelect(question)}
            className="text-xs"
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Spending insight card
 */
export function SpendingInsightCard({
  summary,
  trends,
  recommendations,
  isLoading,
}: {
  summary?: string;
  trends?: string[];
  recommendations?: string[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h3 className="font-semibold" id="insights-heading">AI Insights</h3>
        </div>
        <div className="space-y-3" role="status" aria-live="polite" aria-label="Loading insights">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Sparkles className="h-5 w-5 text-blue-600" aria-hidden="true" />
        <h3 className="font-semibold" id="insights-heading">AI Insights</h3>
      </div>

      {summary && (
        <p className="text-gray-700 mb-4">{summary}</p>
      )}

      {trends && trends.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Trends</h4>
          <ul className="text-sm text-gray-600 space-y-1" role="list">
            {trends.map((trend, i) => (
              <li key={i} className="flex items-start">
                <span className="mr-2" aria-hidden="true">•</span>
                <span>{trend}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendations && recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h4>
          <ul className="text-sm text-gray-600 space-y-1" role="list">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start">
                <span className="mr-2" aria-hidden="true">💡</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
