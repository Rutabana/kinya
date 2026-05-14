"use client";

import { useState, useRef } from "react";
import { ArrowLeftRight, Copy, Check, Loader2, ChevronLeft, BookmarkPlus } from "lucide-react";
import Link from "next/link";
import { loadState, saveState, newCard, todayKey } from "@/lib/srs";
import words from "@/data/words.json";

type Direction = "en-rw" | "rw-en";

interface Result {
  translation: string;
  romanization?: string;
  notes?: string;
}

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

function savePhrases(phrases: SavedPhrase[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(phrases));
}

export default function Translate() {
  const [direction, setDirection] = useState<Direction>("en-rw");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"translate" | "saved">("translate");
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fromLabel = direction === "en-rw" ? "English" : "Kinyarwanda";
  const toLabel = direction === "en-rw" ? "Kinyarwanda" : "English";

  const translate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setSaved(false);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, direction }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Translation failed. Check your API key or try again.");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const savePhrase = () => {
    if (!result) return;
    const phrase: SavedPhrase = {
      input,
      translation: result.translation,
      romanization: result.romanization,
      direction,
      savedAt: Date.now(),
    };
    const existing = loadSaved();
    const updated = [phrase, ...existing].slice(0, 50);
    savePhrases(updated);
    setSaved(true);

    // Try to match to a word card in the system
    const matchedWord = (words as { id: number; rw: string; en: string }[]).find(
      (w) =>
        w.rw.toLowerCase() === result.translation.toLowerCase() ||
        w.en.toLowerCase() === result.translation.toLowerCase()
    );
    if (matchedWord) {
      const state = loadState();
      if (!state.cards[matchedWord.id]) {
        const key = todayKey();
        const todayStats = state.dailyStats[key] ?? { reviewed: 0, newCards: 0 };
        saveState({
          cards: { ...state.cards, [matchedWord.id]: newCard(matchedWord.id) },
          dailyStats: { ...state.dailyStats, [key]: { ...todayStats, newCards: todayStats.newCards + 1 } },
        });
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 pt-10 pb-6">
      <Link href="/" className="flex items-center gap-1 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <ChevronLeft size={16} /> Home
      </Link>

      <h1 className="text-2xl font-bold mb-1">Translate</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 mt-4" style={{ background: "var(--surface)" }}>
        {(["translate", "saved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "saved") setSavedPhrases(loadSaved());
            }}
            className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all"
            style={{
              background: tab === t ? "var(--surface2)" : "transparent",
              color: tab === t ? "var(--text)" : "var(--text-muted)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "translate" ? (
        <div className="flex flex-col gap-4">
          {/* Direction toggle */}
          <div className="flex items-center gap-2">
            <span
              className="flex-1 text-center text-sm font-medium py-2 rounded-lg"
              style={{ background: "var(--surface)" }}
            >
              {fromLabel}
            </span>
            <button
              onClick={() => {
                setDirection((d) => (d === "en-rw" ? "rw-en" : "en-rw"));
                setResult(null);
                setInput("");
              }}
              className="p-2 rounded-lg transition-all active:scale-90"
              style={{ background: "var(--surface)", color: "var(--accent)" }}
            >
              <ArrowLeftRight size={18} />
            </button>
            <span
              className="flex-1 text-center text-sm font-medium py-2 rounded-lg"
              style={{ background: "var(--surface)" }}
            >
              {toLabel}
            </span>
          </div>

          {/* Input */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) translate();
              }}
              placeholder={`Type in ${fromLabel}…`}
              rows={4}
              className="w-full rounded-xl p-4 text-sm resize-none outline-none transition-all"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
            <span className="absolute bottom-3 right-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
              ⌘↵ to translate
            </span>
          </div>

          <button
            onClick={translate}
            disabled={loading || !input.trim()}
            className="w-full py-3 rounded-xl font-semibold text-black transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Translating…
              </span>
            ) : (
              "Translate"
            )}
          </button>

          {error && (
            <p className="text-sm text-center" style={{ color: "var(--red)" }}>
              {error}
            </p>
          )}

          {result && (
            <div
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs mb-1 font-semibold" style={{ color: "var(--text-muted)" }}>
                    {toLabel}
                  </p>
                  <p className="text-xl font-bold" style={{ color: "var(--accent)" }}>
                    {result.translation}
                  </p>
                  {result.romanization && (
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      /{result.romanization}/
                    </p>
                  )}
                  {result.notes && (
                    <p className="text-xs mt-2 italic" style={{ color: "var(--text-muted)" }}>
                      {result.notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={copy}
                    className="p-2 rounded-lg transition-all"
                    style={{ background: "var(--surface2)", color: copied ? "var(--green)" : "var(--text-muted)" }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={savePhrase}
                    className="p-2 rounded-lg transition-all"
                    style={{ background: "var(--surface2)", color: saved ? "var(--green)" : "var(--text-muted)" }}
                    title="Save phrase"
                  >
                    <BookmarkPlus size={16} />
                  </button>
                </div>
              </div>
              {saved && (
                <p className="text-xs" style={{ color: "var(--green)" }}>
                  Saved to phrases ✓
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {savedPhrases.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--text-muted)" }}>
              No saved phrases yet. Translate something and tap the bookmark icon.
            </p>
          ) : (
            savedPhrases.map((p, i) => (
              <div
                key={i}
                className="rounded-xl p-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                  {p.direction === "en-rw" ? "EN → RW" : "RW → EN"}
                </p>
                <p className="text-sm text-muted" style={{ color: "var(--text-muted)" }}>{p.input}</p>
                <p className="text-base font-semibold mt-1" style={{ color: "var(--accent)" }}>
                  {p.translation}
                </p>
                {p.romanization && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>/{p.romanization}/</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
