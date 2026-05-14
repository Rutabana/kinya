"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ChevronLeft, Zap, BookOpen, Star } from "lucide-react";
import Link from "next/link";
import {
  loadState,
  saveState,
  getFlatQueue,
  buildQueue,
  applyReview,
  newCard,
  ratingLabels,
  todayKey,
  type Word,
  type ReviewCard,
  type ReviewState,
} from "@/lib/srs";
import words from "@/data/words.json";

type Screen = "idle" | "session" | "done";

const CATEGORIES = [
  "all", "greetings", "numbers", "family", "food",
  "verbs", "places", "time", "phrases", "colors", "daily",
];

// How many wrong answers in a row before re-inserting the card at end of session
const REQUEUE_ON_AGAIN = true;

export default function Flashcards() {
  const [screen, setScreen] = useState<Screen>("idle");
  const [queue, setQueue] = useState<Word[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [state, setState] = useState<ReviewState | null>(null);
  const [category, setCategory] = useState("all");
  const [sessionStats, setSessionStats] = useState({ easy: 0, good: 0, hard: 0, again: 0 });
  const [requeuedIds, setRequeuedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setState(loadState());
  }, []);

  const filteredWords = useCallback((): Word[] => {
    return category === "all"
      ? (words as Word[])
      : (words as Word[]).filter((w) => w.category === category);
  }, [category]);

  const startSession = useCallback(() => {
    if (!state) return;
    const q = getFlatQueue(state, filteredWords());
    if (q.length === 0) return;
    setQueue(q);
    setIdx(0);
    setFlipped(false);
    setScreen("session");
    setSessionStats({ easy: 0, good: 0, hard: 0, again: 0 });
    setRequeuedIds(new Set());
  }, [state, filteredWords]);

  const handleRate = useCallback(
    (rating: 0 | 1 | 2 | 3) => {
      if (!state) return;
      const word = queue[idx];
      const existing = state.cards[word.id] ?? newCard(word.id);
      const isNew = !state.cards[word.id];
      const updated = applyReview(existing, rating);

      const key = todayKey();
      const todayStats = state.dailyStats[key] ?? { reviewed: 0, newCards: 0 };
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
        easy:  s.easy  + (rating === 3 ? 1 : 0),
        good:  s.good  + (rating === 2 ? 1 : 0),
        hard:  s.hard  + (rating === 1 ? 1 : 0),
        again: s.again + (rating === 0 ? 1 : 0),
      }));

      // Re-queue wrong cards at the end of session (only once per card)
      let nextQueue = queue;
      if (rating === 0 && REQUEUE_ON_AGAIN && !requeuedIds.has(word.id)) {
        setRequeuedIds((s) => new Set([...s, word.id]));
        nextQueue = [...queue, word];
        setQueue(nextQueue);
      }

      const nextIdx = idx + 1;
      if (nextIdx >= nextQueue.length) {
        setScreen("done");
      } else {
        setIdx(nextIdx);
        setFlipped(false);
      }
    },
    [state, queue, idx, requeuedIds]
  );

  const word = queue[idx] as Word | undefined;
  const currentCard: ReviewCard | null = state?.cards[word?.id ?? -1] ?? null;
  const labels = ratingLabels(currentCard);

  // ── Queue breakdown for idle screen ──────────────────────────────────────
  const queueStats = state
    ? (() => {
        const { learning, review, newWords } = buildQueue(state, filteredWords());
        return { learning: learning.length, review: review.length, newW: newWords.length };
      })()
    : { learning: 0, review: 0, newW: 0 };

  const totalDue = queueStats.learning + queueStats.review + queueStats.newW;

  // ── Idle screen ───────────────────────────────────────────────────────────
  if (screen === "idle" || !state) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-10 pb-8">
        <Link href="/" className="flex items-center gap-1 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          <ChevronLeft size={16} /> Home
        </Link>
        <h1 className="text-2xl font-bold mb-1">Flashcards</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Harder cards come back sooner. Easy cards are spaced out.
        </p>

        {/* Queue breakdown */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <QueueChip icon={<Zap size={13} />} count={queueStats.learning} label="Learning" color="var(--accent)" />
          <QueueChip icon={<RotateCcw size={13} />} count={queueStats.review} label="Review" color="var(--blue)" />
          <QueueChip icon={<BookOpen size={13} />} count={queueStats.newW} label="New" color="var(--green)" />
        </div>

        {/* Category filter */}
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: "var(--text-muted)" }}>
          Category
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all active:scale-95"
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
          disabled={totalDue === 0}
          className="w-full py-4 rounded-xl font-semibold text-black transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {totalDue > 0 ? `Study ${totalDue} cards` : "Nothing due — come back later!"}
        </button>

        {/* Progress */}
        <div
          className="mt-5 rounded-xl p-4 flex items-center justify-between"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Cards in system</p>
            <p className="text-2xl font-bold">{Object.keys(state?.cards ?? {}).length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Total words</p>
            <p className="text-2xl font-bold" style={{ color: "var(--text-muted)" }}>{words.length}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (screen === "done") {
    const total = sessionStats.easy + sessionStats.good + sessionStats.hard + sessionStats.again;
    const accuracy = total > 0 ? Math.round(((sessionStats.easy + sessionStats.good) / total) * 100) : 0;
    return (
      <div className="max-w-xl mx-auto px-4 pt-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="text-5xl mb-4"
        >
          {accuracy >= 80 ? "🎉" : accuracy >= 50 ? "💪" : "📖"}
        </motion.div>
        <h2 className="text-2xl font-bold mb-1">Session done!</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          {accuracy}% accuracy across {total} cards
        </p>

        <div className="grid grid-cols-4 gap-2 w-full mb-6">
          {[
            { label: "Easy",  value: sessionStats.easy,  color: "var(--green)" },
            { label: "Good",  value: sessionStats.good,  color: "var(--blue)" },
            { label: "Hard",  value: sessionStats.hard,  color: "var(--accent)" },
            { label: "Again", value: sessionStats.again, color: "var(--red)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl py-3" style={{ background: "var(--surface)" }}>
              <p className="text-lg font-bold" style={{ color }}>{value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Next due info */}
        <div
          className="w-full rounded-xl p-4 mb-6 text-left"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Spacing schedule</p>
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
            <span style={{ color: "var(--red)" }}>●</span> Wrong → back in 6 hours
          </div>
          <div className="flex items-center gap-3 text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            <span style={{ color: "var(--blue)" }}>●</span> Good → advances: 6h → 1d → 1mo → 1yr
          </div>
          <div className="flex items-center gap-3 text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            <span style={{ color: "var(--green)" }}>●</span> Easy → jumps to 1 year
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={startSession}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <RotateCcw size={15} /> Study more
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

  // ── Session screen ─────────────────────────────────────────────────────────
  const phaseBadge =
    currentCard?.phase === "review"
      ? { label: "Review", color: "var(--blue)" }
      : currentCard?.phase === "learning"
      ? { label: "Learning", color: "var(--accent)" }
      : { label: "New", color: "var(--green)" };

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 flex flex-col" style={{ minHeight: "calc(100dvh - 80px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setScreen("idle")} style={{ color: "var(--text-muted)" }}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--accent)" }}
            animate={{ width: `${(idx / queue.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
          {idx + 1}/{queue.length}
        </span>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col justify-center py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${word?.id}-${flipped}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.18 }}
            onClick={() => !flipped && setFlipped(true)}
            className="rounded-2xl p-7 cursor-pointer select-none flex flex-col justify-between"
            style={{
              background: "var(--surface)",
              border: `1px solid ${flipped ? "var(--accent)" : "var(--border)"}`,
              minHeight: 240,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: "var(--surface2)", color: "var(--text-muted)" }}
                >
                  {word?.category}
                </span>
                <span
                  className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "var(--surface2)", color: phaseBadge.color }}
                >
                  {phaseBadge.label}
                </span>
              </div>
              {currentCard?.phase === "review" && (
                <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Star size={11} />
                  <span className="text-[10px]">{currentCard.repetitions}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center text-center py-6">
              {!flipped ? (
                <>
                  <p className="text-4xl font-bold mb-2" style={{ color: "var(--accent)" }}>
                    {word?.rw}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    /{word?.romanization}/
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-semibold mb-2">{word?.en}</p>
                  <p className="text-sm mb-1" style={{ color: "var(--accent)" }}>{word?.rw}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>/{word?.romanization}/</p>
                </>
              )}
            </div>

            {!flipped ? (
              <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
                Tap to reveal
              </p>
            ) : (
              <div />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rating buttons — show actual next-review intervals */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pb-4 pt-3"
          >
            <p className="text-center text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
              How well did you know it?
            </p>
            <div className="grid grid-cols-4 gap-2">
              <RateBtn label="Again" interval={labels[0]} color="var(--red)"    onClick={() => handleRate(0)} />
              <RateBtn label="Hard"  interval={labels[1]} color="var(--accent)" onClick={() => handleRate(1)} />
              <RateBtn label="Good"  interval={labels[2]} color="var(--blue)"   onClick={() => handleRate(2)} />
              <RateBtn label="Easy"  interval={labels[3]} color="var(--green)"  onClick={() => handleRate(3)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QueueChip({
  icon, count, label, color,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1"
      style={{ background: "var(--surface)", borderTop: `2px solid ${color}` }}
    >
      <div style={{ color }}>{icon}</div>
      <span className="text-xl font-bold tabular-nums">{count}</span>
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

function RateBtn({
  label, interval, color, onClick,
}: {
  label: string;
  interval: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="py-3 rounded-xl flex flex-col items-center gap-0.5 active:scale-[0.95] transition-all"
      style={{ background: "var(--surface)", border: `1px solid ${color}` }}
    >
      <span className="text-sm font-semibold" style={{ color }}>
        {label}
      </span>
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
        {interval}
      </span>
    </button>
  );
}
