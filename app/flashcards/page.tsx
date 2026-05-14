"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ChevronLeft } from "lucide-react";
import Link from "next/link";
import {
  loadState,
  saveState,
  getDueCards,
  applyReview,
  newCard,
  todayKey,
  type Word,
  type ReviewState,
} from "@/lib/srs";
import words from "@/data/words.json";

type Phase = "idle" | "question" | "answer" | "done";

const CATEGORIES = ["all", "greetings", "numbers", "family", "food", "verbs", "places", "time", "phrases", "colors", "daily"];

export default function Flashcards() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [state, setState] = useState<ReviewState | null>(null);
  const [category, setCategory] = useState("all");
  const [sessionStats, setSessionStats] = useState({ correct: 0, hard: 0, again: 0 });

  useEffect(() => {
    setState(loadState());
  }, []);

  const startSession = useCallback(() => {
    if (!state) return;
    const filtered = category === "all"
      ? (words as Word[])
      : (words as Word[]).filter((w) => w.category === category);
    const due = getDueCards(state, filtered, 20);
    if (due.length === 0) return;
    setQueue(due);
    setCurrentIdx(0);
    setFlipped(false);
    setPhase("question");
    setSessionStats({ correct: 0, hard: 0, again: 0 });
  }, [state, category]);

  const handleRate = useCallback(
    (quality: number) => {
      if (!state) return;
      const word = queue[currentIdx];
      const existing = state.cards[word.id] ?? newCard(word.id);
      const updated = applyReview(existing, quality);

      const key = todayKey();
      const todayStats = state.dailyStats[key] ?? { reviewed: 0, newCards: 0 };
      const isNew = !state.cards[word.id];

      const newState: ReviewState = {
        cards: { ...state.cards, [word.id]: updated },
        dailyStats: {
          ...state.dailyStats,
          [key]: {
            reviewed: todayStats.reviewed + 1,
            newCards: todayStats.newCards + (isNew ? 1 : 0),
          },
        },
      };

      saveState(newState);
      setState(newState);

      setSessionStats((s) => ({
        correct: s.correct + (quality >= 4 ? 1 : 0),
        hard: s.hard + (quality === 3 ? 1 : 0),
        again: s.again + (quality < 3 ? 1 : 0),
      }));

      if (currentIdx + 1 >= queue.length) {
        setPhase("done");
      } else {
        setCurrentIdx((i) => i + 1);
        setFlipped(false);
        setPhase("question");
      }
    },
    [state, queue, currentIdx]
  );

  const word = queue[currentIdx];

  if (phase === "idle" || !state) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-10">
        <Link href="/" className="flex items-center gap-1 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          <ChevronLeft size={16} /> Home
        </Link>
        <h1 className="text-2xl font-bold mb-1">Flashcards</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Spaced repetition — cards appear more often when you struggle with them.
        </p>

        <label className="text-xs font-semibold uppercase tracking-widest block mb-2" style={{ color: "var(--text-muted)" }}>
          Category
        </label>
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
              style={{
                background: category === c ? "var(--accent)" : "var(--surface)",
                color: category === c ? "#000" : "var(--text-muted)",
                border: `1px solid ${category === c ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <button
          onClick={startSession}
          className="w-full py-4 rounded-xl font-semibold text-black transition-all active:scale-[0.98]"
          style={{ background: "var(--accent)" }}
        >
          Start session
        </button>

        <div className="mt-6 rounded-xl p-4" style={{ background: "var(--surface)" }}>
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Words in system</p>
          <p className="text-2xl font-bold">{Object.keys(state?.cards ?? {}).length}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>of {words.length} total words</p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="max-w-xl mx-auto px-4 pt-10 flex flex-col items-center text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">Session complete!</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          You reviewed {queue.length} cards
        </p>
        <div className="grid grid-cols-3 gap-3 w-full mb-8">
          <div className="rounded-xl p-3" style={{ background: "var(--surface)" }}>
            <p className="text-xl font-bold" style={{ color: "var(--green)" }}>{sessionStats.correct}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Easy</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--surface)" }}>
            <p className="text-xl font-bold" style={{ color: "var(--accent)" }}>{sessionStats.hard}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Hard</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--surface)" }}>
            <p className="text-xl font-bold" style={{ color: "var(--red)" }}>{sessionStats.again}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Again</p>
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={startSession}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <RotateCcw size={16} /> Again
          </button>
          <Link
            href="/"
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-center text-black"
            style={{ background: "var(--accent)" }}
          >
            Done
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 flex flex-col min-h-[calc(100vh-80px)]">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setPhase("idle")} style={{ color: "var(--text-muted)" }}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--surface)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((currentIdx) / queue.length) * 100}%`,
              background: "var(--accent)",
            }}
          />
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {currentIdx + 1}/{queue.length}
        </span>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${word.id}-${flipped}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            onClick={() => !flipped && setFlipped(true)}
            className="rounded-2xl p-8 cursor-pointer select-none min-h-[260px] flex flex-col justify-between"
            style={{
              background: "var(--surface)",
              border: `1px solid ${flipped ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: "var(--surface2)", color: "var(--text-muted)" }}
              >
                {word.category}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {flipped ? "EN" : "RW"}
              </span>
            </div>

            <div className="flex flex-col items-center text-center py-4">
              {!flipped ? (
                <>
                  <p className="text-4xl font-bold mb-3" style={{ color: "var(--accent)" }}>{word.rw}</p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>/{word.romanization}/</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-semibold mb-2">{word.en}</p>
                  <p className="text-sm mb-1" style={{ color: "var(--accent)" }}>{word.rw}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>/{word.romanization}/</p>
                </>
              )}
            </div>

            {!flipped && (
              <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
                Tap to reveal
              </p>
            )}
            {flipped && <div />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rating buttons */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex gap-3 pb-4 pt-4"
          >
            <RateBtn label="Again" sublabel="<1d" color="var(--red)" onClick={() => handleRate(1)} />
            <RateBtn label="Hard" sublabel="~1d" color="var(--accent)" onClick={() => handleRate(3)} />
            <RateBtn label="Good" sublabel={`~${Math.max(1, Math.round((state?.cards[word.id]?.interval ?? 1) * 2))}d`} color="var(--blue)" onClick={() => handleRate(4)} />
            <RateBtn label="Easy" sublabel="skip" color="var(--green)" onClick={() => handleRate(5)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RateBtn({
  label,
  sublabel,
  color,
  onClick,
}: {
  label: string;
  sublabel: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-3 rounded-xl flex flex-col items-center gap-0.5 active:scale-[0.96] transition-all"
      style={{ background: "var(--surface)", border: `1px solid ${color}` }}
    >
      <span className="text-sm font-semibold" style={{ color }}>
        {label}
      </span>
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
        {sublabel}
      </span>
    </button>
  );
}
