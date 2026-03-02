"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ScoutProgressBar from "./ScoutProgressBar";

interface AgentResult {
  topic?: string;
  skill_count?: number;
  summary?: string;
  skill_map_id?: string;
  cached?: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "status";
  content: string;
  intent?: string;
  topic?: string;
  confidence?: number;
  dispatchedTo?: string | null;
  completedSteps?: string[];
  agentResult?: AgentResult;
  /** For status messages — frozen progress bar state. */
  scoutStatus?: {
    topic: string;
    skillCount: number;
  };
}

interface ChatProps {
  userId: string;
}

/** How long to show the 100% done state before adding the response message. */
const DONE_DISPLAY_MS = 1800;

export default function Chat({ userId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to AdaptLearn! I can help you research topics, create learning content, take quizzes, or track your progress. What would you like to do?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  /** Tracks whether scout is active (show progress bar). */
  const [scoutActive, setScoutActive] = useState(false);
  /** True once the API responds — makes the progress bar snap to 100%. */
  const [scoutDone, setScoutDone] = useState(false);
  /** The topic being researched. */
  const [scoutTopic, setScoutTopic] = useState<string | undefined>();
  /** Number of skills returned by the scout. */
  const [scoutSkillCount, setScoutSkillCount] = useState<number | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, scoutActive, scoutDone]);

  const resetScoutState = useCallback(() => {
    setScoutActive(false);
    setScoutDone(false);
    setScoutTopic(undefined);
    setScoutSkillCount(undefined);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    resetScoutState();

    // Detect research-like intent to show progress bar immediately
    const looksLikeResearch =
      /research|search|find|explore|discover|skills|trend|impact/i.test(trimmed);
    if (looksLikeResearch) {
      setScoutActive(true);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      const isScoutResult = data.dispatchedTo === "scout" && data.completedSteps;

      if (isScoutResult) {
        const topic = data.topic ?? "your topic";
        const skillCount = data.agentResult?.skill_count ?? 0;

        // Snap progress bar to 100%
        setScoutActive(true);
        setScoutTopic(topic);
        setScoutSkillCount(skillCount);
        setScoutDone(true);

        // Hold the 100% completed state so the user can read it
        await new Promise((resolve) => setTimeout(resolve, DONE_DISPLAY_MS));

        // Freeze the completed progress bar as a permanent status message
        const statusMsg: ChatMessage = {
          id: `scout-status-${Date.now()}`,
          role: "status",
          content: "",
          scoutStatus: { topic, skillCount },
        };

        setMessages((prev) => [...prev, statusMsg]);

        // Hide the live progress bar
        resetScoutState();
        setLoading(false);

        // Brief pause then show the response message below
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        intent: data.intent,
        topic: data.topic,
        confidence: data.confidence,
        dispatchedTo: data.dispatchedTo,
        completedSteps: data.completedSteps,
        agentResult: data.agentResult,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}. Please try again.`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      resetScoutState();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          // Frozen scout status message — completed progress bar
          if (msg.role === "status" && msg.scoutStatus) {
            return (
              <div key={msg.id}>
                <ScoutProgressBar
                  done={true}
                  topic={msg.scoutStatus.topic}
                  skillCount={msg.scoutStatus.skillCount}
                />
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-900 border border-gray-200"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Completed steps progress */}
                {msg.completedSteps && msg.completedSteps.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                    {msg.completedSteps.map((step, i) => {
                      const isNext = step.startsWith("Next step:");
                      return (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className={`mt-0.5 flex-shrink-0 ${isNext ? "text-blue-500" : "text-green-500"}`}>
                            {isNext ? "\u25B6" : "\u2713"}
                          </span>
                          <span className={isNext ? "text-blue-700" : "text-gray-700"}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Agent result summary */}
                {msg.agentResult?.summary && (
                  <div className="mt-3 rounded bg-gray-50 p-3 text-sm text-gray-700 border border-gray-100">
                    <p className="font-medium text-gray-900 mb-1">Research Summary</p>
                    <p>{msg.agentResult.summary}</p>
                    {msg.agentResult.skill_count != null && (
                      <p className="mt-1 text-xs text-gray-500">
                        {msg.agentResult.skill_count} skills identified
                      </p>
                    )}
                  </div>
                )}

                {/* Intent / topic / confidence chips */}
                {msg.intent && msg.role === "assistant" && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {msg.intent}
                    </span>
                    {msg.topic && (
                      <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                        {msg.topic}
                      </span>
                    )}
                    {msg.confidence != null && (
                      <span className="inline-block rounded bg-green-50 px-2 py-0.5 text-xs text-green-600">
                        {Math.round(msg.confidence * 100)}% confident
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live loading indicator */}
        {loading && (
          scoutActive ? (
            <ScoutProgressBar
              done={scoutDone}
              topic={scoutTopic}
              skillCount={scoutSkillCount}
            />
          ) : (
            <div className="flex justify-start">
              <div className="rounded-lg bg-white border border-gray-200 px-4 py-2 text-gray-400">
                Thinking...
              </div>
            </div>
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 bg-white p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Agentic AI, Salesforce Agentforce, AI Strategy..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
