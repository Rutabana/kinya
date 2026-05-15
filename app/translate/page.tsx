"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeftRight, Send, Star, Trash2, Loader2, ChevronLeft } from "lucide-react";
import Link from "next/link";

type Direction = "en-rw" | "rw-en";

interface UserMessage {
  role: "user";
  text: string;
  direction: Direction;
}

interface AssistantMessage {
  role: "assistant";
  text: string;
  romanization?: string;
  notes?: string;
  direction: Direction;
  starred: boolean;
}

type Message = UserMessage | AssistantMessage;

interface SavedPhrase {
  input: string;
  translation: string;
  romanization?: string;
  direction: Direction;
  savedAt: number;
}

const SAVED_KEY = "kinya_saved_phrases";

function loadSaved(): SavedPhrase[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistSaved(phrases: SavedPhrase[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(phrases));
}

export default function Translate() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<Direction>("en-rw");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"chat" | "saved">("chat");
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSavedPhrases(loadSaved());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: UserMessage = { role: "user", text, direction };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Pass last 6 messages as context (3 turns)
    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content:
        m.role === "user"
          ? m.text
          : JSON.stringify({
              translation: (m as AssistantMessage).text,
              romanization: (m as AssistantMessage).romanization,
              notes: (m as AssistantMessage).notes,
            }),
    }));

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, direction, history }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const assistantMsg: AssistantMessage = {
        role: "assistant",
        text: data.translation,
        romanization: data.romanization,
        notes: data.notes,
        direction,
        starred: false,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Translation failed. Please try again.", direction, starred: false },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const starMessage = (idx: number) => {
    const msg = messages[idx] as AssistantMessage;
    const userMsg = [...messages].slice(0, idx).reverse().find((m) => m.role === "user") as UserMessage | undefined;

    const phrase: SavedPhrase = {
      input: userMsg?.text ?? "",
      translation: msg.text,
      romanization: msg.romanization,
      direction: msg.direction,
      savedAt: Date.now(),
    };

    const updated = [phrase, ...savedPhrases].slice(0, 50);
    persistSaved(updated);
    setSavedPhrases(updated);
    setMessages((prev) => prev.map((m, i) => (i === idx ? { ...m, starred: true } : m)));
  };

  const fromLabel = direction === "en-rw" ? "English" : "Kinyarwanda";
  const toLabel = direction === "en-rw" ? "Kinyarwanda" : "English";

  return (
    <div className="max-w-xl mx-auto flex flex-col" style={{ height: "100dvh" }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center" style={{ color: "var(--text-muted)" }}>
              <ChevronLeft size={18} />
            </Link>
            <h1 className="text-2xl font-bold">Translate</h1>
          </div>
          {messages.length > 0 && tab === "chat" && (
            <button
              onClick={() => setMessages([])}
              className="p-2 rounded-lg"
              style={{ color: "var(--text-muted)", background: "var(--surface)" }}
              title="Clear conversation"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mt-4" style={{ background: "var(--surface)" }}>
          {(["chat", "saved"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all"
              style={{
                background: tab === t ? "var(--surface2)" : "transparent",
                color: tab === t ? "var(--text)" : "var(--text-muted)",
              }}
            >
              {t === "saved" ? `Saved${savedPhrases.length > 0 ? ` (${savedPhrases.length})` : ""}` : "Chat"}
            </button>
          ))}
        </div>
      </div>

      {tab === "chat" ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <p className="text-4xl select-none" aria-hidden>💬</p>
                <p className="text-sm font-semibold">Start translating</p>
                <p className="text-xs max-w-[220px]" style={{ color: "var(--text-muted)" }}>
                  Type in English or Kinyarwanda. Star any response to save it.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-2">
                {messages.map((msg, i) =>
                  msg.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <div
                        className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                      >
                        <p className="text-[10px] mb-1 font-medium" style={{ color: "var(--text-muted)" }}>
                          {msg.direction === "en-rw" ? "English" : "Kinyarwanda"}
                        </p>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex justify-start">
                      <div
                        className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderLeft: "3px solid var(--accent)",
                        }}
                      >
                        <p className="text-[10px] mb-1 font-medium" style={{ color: "var(--accent)" }}>
                          {msg.direction === "en-rw" ? "Kinyarwanda" : "English"}
                        </p>
                        <p className="text-base font-semibold leading-snug" style={{ color: "var(--accent)" }}>
                          {msg.text}
                        </p>
                        {msg.romanization && (
                          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                            /{msg.romanization}/
                          </p>
                        )}
                        {msg.notes && (
                          <p className="text-xs mt-2 italic leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            {msg.notes}
                          </p>
                        )}
                        <button
                          onClick={() => starMessage(i)}
                          className="mt-2 p-1 rounded transition-all active:scale-90"
                          style={{ color: msg.starred ? "var(--accent)" : "var(--text-muted)" }}
                          title={msg.starred ? "Saved" : "Save phrase"}
                        >
                          <Star size={13} fill={msg.starred ? "var(--accent)" : "none"} />
                        </button>
                      </div>
                    </div>
                  )
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div
                      className="px-4 py-3 rounded-2xl rounded-tl-sm"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderLeft: "3px solid var(--accent)",
                      }}
                    >
                      <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input bar */}
          <div
            className="flex-shrink-0 px-4 pb-safe pt-3"
            style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-lg"
                style={{ background: "var(--surface)", color: "var(--text-muted)" }}
              >
                {fromLabel}
              </span>
              <button
                onClick={() => setDirection((d) => (d === "en-rw" ? "rw-en" : "en-rw"))}
                className="p-1.5 rounded-lg transition-all active:scale-90"
                style={{ background: "var(--surface)", color: "var(--accent)" }}
              >
                <ArrowLeftRight size={14} />
              </button>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-lg"
                style={{ background: "var(--surface)", color: "var(--text-muted)" }}
              >
                {toLabel}
              </span>
            </div>

            <div className="flex items-end gap-2 pb-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                }}
                placeholder={`Type in ${fromLabel}…`}
                rows={1}
                maxLength={500}
                className="flex-1 rounded-xl px-4 py-3 text-sm resize-none outline-none"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="p-3 rounded-xl transition-all active:scale-90 disabled:opacity-40 flex-shrink-0"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {savedPhrases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <p className="text-4xl select-none" aria-hidden>⭐</p>
              <p className="text-sm font-semibold">No saved phrases yet</p>
              <p className="text-xs max-w-[220px]" style={{ color: "var(--text-muted)" }}>
                Tap the star on any translation to save it here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pt-2">
              {savedPhrases.map((p) => (
                <div
                  key={p.savedAt}
                  className="rounded-xl p-4"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <p className="text-[10px] mb-1 font-semibold" style={{ color: "var(--text-muted)" }}>
                    {p.direction === "en-rw" ? "EN → RW" : "RW → EN"}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{p.input}</p>
                  <p className="text-base font-semibold mt-1" style={{ color: "var(--accent)" }}>
                    {p.translation}
                  </p>
                  {p.romanization && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>/{p.romanization}/</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
