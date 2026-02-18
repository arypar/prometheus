"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { usePitchDetail } from "@/hooks/useData";
import { Send, Loader2, Flame, Eye, Target } from "lucide-react";
import type { PitchMessage, Pitch } from "@/types";

type Phase = "IDLE" | "CHATTING" | "VERDICT";

interface PitchChatProps {
  activePitchId: string | null;
  onPitchCreated: (pitchId: string) => void;
}

export function PitchChat({ activePitchId, onPitchCreated }: PitchChatProps) {
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [tokenAddress, setTokenAddress] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<PitchMessage[]>([]);
  const [currentPitch, setCurrentPitch] = useState<Pitch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{
    sentiment: string;
    confidence: number;
    reasoning: string;
    watchlisted: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load existing pitch when selected from feed
  const { data: loadedPitch } = usePitchDetail(activePitchId);

  useEffect(() => {
    if (loadedPitch) {
      setCurrentPitch(loadedPitch);
      setMessages(loadedPitch.messages);
      setTokenAddress(loadedPitch.tokenAddress);
      if (loadedPitch.status === "COMPLETED") {
        setPhase("VERDICT");
        if (loadedPitch.verdict) {
          setVerdict({
            sentiment: loadedPitch.verdict,
            confidence: loadedPitch.confidence || 0,
            reasoning: loadedPitch.verdictReasoning || "",
            watchlisted: loadedPitch.watchlisted,
          });
        }
      } else {
        setPhase("CHATTING");
        setVerdict(null);
      }
    }
  }, [loadedPitch]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function resetChat() {
    setPhase("IDLE");
    setTokenAddress("");
    setMessageInput("");
    setMessages([]);
    setCurrentPitch(null);
    setError(null);
    setVerdict(null);
  }

  async function handleStartPitch(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenAddress.trim() || !messageInput.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.createPitch(tokenAddress.trim(), messageInput.trim());
      setCurrentPitch(result.pitch);
      setMessages(result.messages);
      setMessageInput("");
      setPhase("CHATTING");
      onPitchCreated(result.pitch.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start pitch");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageInput.trim() || !currentPitch || isLoading) return;

    const userMessage = messageInput.trim();
    setMessageInput("");
    setIsLoading(true);
    setError(null);

    // Optimistically add user message
    const tempUserMsg: PitchMessage = {
      id: `temp-${Date.now()}`,
      pitchId: currentPitch.id,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await api.sendPitchMessage(currentPitch.id, userMessage);
      // Replace temp message and add assistant response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        { ...tempUserMsg, id: `user-${Date.now()}` },
        result.message,
      ]);

      if (result.verdict) {
        setVerdict(result.verdict);
        setPhase("VERDICT");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="flex flex-col h-full p-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ash/50 bg-charcoal/80 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-torch-gold" />
            <span className="text-[10px] text-stone uppercase tracking-widest font-[var(--font-mono)]">
              Pitch to Prometheus
            </span>
          </div>
          {phase !== "IDLE" && (
            <button
              onClick={resetChat}
              className="text-[9px] text-stone hover:text-torch-gold transition-colors font-[var(--font-mono)]"
            >
              New Pitch
            </button>
          )}
        </div>
        {currentPitch && (
          <div className="mt-1.5 flex items-center gap-2">
            {currentPitch.tokenImageUrl ? (
              <img
                src={currentPitch.tokenImageUrl}
                alt=""
                className="w-5 h-5 rounded-full"
              />
            ) : null}
            <span className="text-xs text-ivory font-medium">
              {currentPitch.tokenName || currentPitch.tokenSymbol}
            </span>
            <span className="text-[9px] text-stone font-[var(--font-mono)]">
              {currentPitch.tokenSymbol}
            </span>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* IDLE phase */}
        {phase === "IDLE" && (
          <form onSubmit={handleStartPitch} className="p-4 space-y-4">
            <div className="text-center py-6">
              <Flame className="w-10 h-10 text-torch-gold/40 mx-auto mb-3" />
              <h2 className="text-sm text-ivory font-medium mb-1">Pitch a Token</h2>
              <p className="text-[11px] text-stone max-w-sm mx-auto">
                Enter a nad.fun token address and make your case. Convince Prometheus to invest.
              </p>
            </div>

            <div>
              <label className="text-[9px] text-stone uppercase tracking-wider block mb-1.5">
                Token Address
              </label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-obsidian border border-ash/60 rounded-lg px-3 py-2 text-xs text-ivory font-[var(--font-mono)] placeholder:text-stone/30 focus:outline-none focus:border-torch-gold/40"
              />
            </div>

            <div>
              <label className="text-[9px] text-stone uppercase tracking-wider block mb-1.5">
                Your Pitch
              </label>
              <textarea
                ref={inputRef}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Why should Prometheus invest in this token?"
                rows={3}
                maxLength={1000}
                className="w-full bg-obsidian border border-ash/60 rounded-lg px-3 py-2 text-xs text-ivory placeholder:text-stone/30 focus:outline-none focus:border-torch-gold/40 resize-none"
              />
              <div className="text-right text-[8px] text-stone/40 mt-0.5">
                {messageInput.length}/1000
              </div>
            </div>

            {error && (
              <p className="text-[10px] text-prometheus-red">{error}</p>
            )}

            <button
              type="submit"
              disabled={!tokenAddress.trim() || !messageInput.trim() || isLoading}
              className="w-full py-2.5 rounded-lg bg-torch-gold/10 border border-torch-gold/30 text-torch-gold text-xs font-semibold hover:bg-torch-gold/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing token...
                </>
              ) : (
                <>
                  <Target className="w-3.5 h-3.5" />
                  Start Pitch
                </>
              )}
            </button>
          </form>
        )}

        {/* CHATTING / VERDICT phase - message list */}
        {(phase === "CHATTING" || phase === "VERDICT") && (
          <div className="p-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    msg.role === "user"
                      ? "bg-ash/40 text-ivory"
                      : "bg-charcoal border border-ash/60 text-ivory/90"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Flame className="w-3 h-3 text-torch-gold" />
                      <span className="text-[8px] text-torch-gold font-semibold uppercase tracking-wider">
                        Prometheus
                      </span>
                    </div>
                  )}
                  <p className={`text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "assistant" ? "font-[var(--font-mono)]" : ""
                  }`}>
                    {msg.content}
                  </p>
                  <p className="text-[8px] text-stone/40 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-charcoal border border-ash/60 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Flame className="w-3 h-3 text-torch-gold" />
                    <span className="text-[8px] text-torch-gold font-semibold uppercase tracking-wider">
                      Prometheus
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-torch-gold/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-torch-gold/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-torch-gold/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Verdict card */}
            {phase === "VERDICT" && verdict && (
              <div className="mt-4 border border-ash/60 rounded-xl overflow-hidden bg-charcoal/80">
                <div className={`px-4 py-2 ${
                  verdict.sentiment === "BULLISH"
                    ? "bg-torch-gold/10 border-b border-torch-gold/20"
                    : verdict.sentiment === "BEARISH"
                    ? "bg-prometheus-red/10 border-b border-prometheus-red/20"
                    : "bg-stone/10 border-b border-stone/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-torch-gold" />
                      <span className="text-[10px] text-stone uppercase tracking-widest font-[var(--font-mono)]">
                        Verdict
                      </span>
                    </div>
                    <Badge
                      variant={
                        verdict.sentiment === "BULLISH" ? "buy" : verdict.sentiment === "BEARISH" ? "sell" : "default"
                      }
                    >
                      {verdict.sentiment}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Confidence bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-stone uppercase tracking-wider">Confidence</span>
                      <span className="text-xs font-bold font-[var(--font-mono)] text-ivory">
                        {verdict.confidence}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-ash/40 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          verdict.sentiment === "BULLISH"
                            ? "bg-torch-gold"
                            : verdict.sentiment === "BEARISH"
                            ? "bg-prometheus-red"
                            : "bg-stone"
                        }`}
                        style={{ width: `${verdict.confidence}%` }}
                      />
                    </div>
                  </div>

                  {/* Reasoning */}
                  <p className="text-xs text-ivory/80 leading-relaxed">
                    {verdict.reasoning}
                  </p>

                  {/* Watchlist status */}
                  {verdict.watchlisted && (
                    <div className="flex items-center gap-2 bg-torch-gold/5 border border-torch-gold/20 rounded-lg px-3 py-2">
                      <Target className="w-3.5 h-3.5 text-torch-gold" />
                      <span className="text-[10px] text-torch-gold font-medium">
                        Added to Prometheus watchlist
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input (CHATTING phase only) */}
      {phase === "CHATTING" && (
        <form
          onSubmit={handleSendMessage}
          className="px-3 py-2 border-t border-ash/50 bg-charcoal/40 shrink-0"
        >
          {error && (
            <p className="text-[9px] text-prometheus-red mb-1.5">{error}</p>
          )}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Make your case..."
              rows={1}
              maxLength={1000}
              className="flex-1 bg-obsidian border border-ash/60 rounded-lg px-3 py-2 text-xs text-ivory placeholder:text-stone/30 focus:outline-none focus:border-torch-gold/40 resize-none"
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || isLoading}
              className="px-3 py-2 rounded-lg bg-torch-gold/10 border border-torch-gold/30 text-torch-gold hover:bg-torch-gold/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
