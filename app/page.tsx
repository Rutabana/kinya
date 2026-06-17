"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Languages, Radio as RadioIcon, Flame, Star, CheckCircle, ChevronRight } from "lucide-react";
import { loadState, getTodayStats, getTotalLearned, getStreak, getFlatQueue } from "@/lib/srs";
import { loadRadioPrefs, todayDateString } from "@/lib/radio";
import words from "@/data/words.json";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay },
});

export default function Dashboard() {
  const [streak, setStreak] = useState(0);
  const [learned, setLearned] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [todayReviewed, setTodayReviewed] = useState(0);
  const [radioToday, setRadioToday] = useState(false);

  useEffect(() => {
    const state = loadState();
    const prefs = loadRadioPrefs();
    setStreak(getStreak(state));
    setLearned(getTotalLearned(state));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setDueCount(getFlatQueue(state, words as any).length);
    setTodayReviewed(getTodayStats(state).reviewed);
    setRadioToday(prefs.lastListenedDate === todayDateString());
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Mwaramutse!" : hour < 18 ? "Muraho!" : "Mwiriwe!";
  const progress = Math.round((learned / words.length) * 100);

  return (
    <div className="max-w-xl mx-auto px-4 pt-10 pb-6">
      {/* Greeting */}
      <motion.div className="mb-8" {...fadeUp(0)}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: "var(--accent)" }}>
              {greeting}
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
              Ready to study?
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {learned} of {words.length} words learned
            </span>
            <span className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
              {progress}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, var(--accent-dim), var(--accent))" }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div className="grid grid-cols-3 gap-3 mb-8" {...fadeUp(0.08)}>
        <StatCard icon={<Flame size={17} />} value={streak}        label="Streak"  color="#f97316" />
        <StatCard icon={<Star size={17} />}  value={learned}       label="Learned" color="var(--accent)" />
        <StatCard icon={<CheckCircle size={17} />} value={todayReviewed} label="Today" color="var(--green)" />
      </motion.div>

      {/* Daily goal */}
      <motion.div {...fadeUp(0.12)}>
        <DailyGoalButton dueCount={dueCount} radioToday={radioToday} />
      </motion.div>

      {/* Action cards */}
      <motion.div {...fadeUp(0.18)}>
        <h2
          className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Practice
        </h2>
        <div className="flex flex-col gap-2.5">
          <ActionCard
            href="/flashcards"
            icon={<BookOpen size={20} />}
            title="Flashcards"
            subtitle={dueCount > 0 ? `${dueCount} cards due` : "All caught up!"}
            accent={dueCount > 0}
          />
          <ActionCard
            href="/translate"
            icon={<Languages size={20} />}
            title="Translate"
            subtitle="Quick lookup"
          />
          <ActionCard
            href="/radio"
            icon={<RadioIcon size={20} />}
            title="Radio"
            subtitle={radioToday ? "Done for today ✓" : "15 min listening goal"}
            done={radioToday}
          />
        </div>
      </motion.div>

      <WordOfDay />
    </div>
  );
}

function DailyGoalButton({ dueCount, radioToday }: { dueCount: number; radioToday: boolean }) {
  const flashcardsDone = dueCount === 0;
  const allDone = flashcardsDone && radioToday;
  const doneTasks = (flashcardsDone ? 1 : 0) + (radioToday ? 1 : 0);

  if (allDone) {
    return (
      <div
        className="w-full rounded-2xl p-5 flex items-center gap-4 mb-8"
        style={{ background: "var(--surface)", border: "1px solid var(--green)" }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(34,197,94,0.12)", color: "var(--green)" }}
        >
          <CheckCircle size={22} />
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--green)" }}>All done for today</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Come back tomorrow</p>
        </div>
        <span className="ml-auto text-xs font-bold" style={{ color: "var(--green)" }}>2 / 2</span>
      </div>
    );
  }

  const href = !flashcardsDone ? "/flashcards" : "/radio";
  const taskName = !flashcardsDone ? "Flashcards" : "Radio";
  const taskDetail = !flashcardsDone ? `${dueCount} cards due` : "15 min listening";
  const TaskIcon = !flashcardsDone ? BookOpen : RadioIcon;

  return (
    <Link
      href={href}
      className="w-full rounded-2xl p-5 flex items-center gap-4 mb-8 active:scale-[0.98] transition-transform duration-150"
      style={{ background: "var(--accent)" }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(15,15,15,0.18)", color: "#0f0f0f" }}
      >
        <TaskIcon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(15,15,15,0.5)" }}>
          Daily goal
        </p>
        <p className="font-bold text-base leading-tight mt-0.5" style={{ color: "#0f0f0f" }}>{taskName}</p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(15,15,15,0.55)" }}>{taskDetail}</p>
      </div>
      <div className="ml-auto flex items-center gap-2" style={{ color: "#0f0f0f" }}>
        <span className="text-xs font-bold" style={{ opacity: 0.55 }}>{doneTasks} / 2</span>
        <ChevronRight size={18} />
      </div>
    </Link>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3.5 flex flex-col gap-1.5"
      style={{
        background: "var(--surface)",
        borderTop: `2px solid ${color}`,
      }}
    >
      <div style={{ color }}>{icon}</div>
      <span className="text-2xl font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  subtitle,
  accent,
  done,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent?: boolean;
  done?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 p-4 rounded-xl transition-all duration-150 active:scale-[0.98]"
      style={{
        background: accent ? "rgba(138,111,62,0.25)" : "var(--surface)",
        border: `1px solid ${accent ? "var(--accent)" : "var(--border)"}`,
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
        style={{
          background: accent ? "rgba(200,169,110,0.15)" : "var(--surface2)",
          color: done ? "var(--green)" : accent ? "var(--accent)" : "var(--text-muted)",
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div
          className="text-xs mt-0.5"
          style={{ color: done ? "var(--green)" : "var(--text-muted)" }}
        >
          {subtitle}
        </div>
      </div>
      <ChevronRight
        size={15}
        className="transition-transform duration-150 group-hover:translate-x-0.5"
        style={{ color: "var(--text-muted)", opacity: 0.6 }}
      />
    </Link>
  );
}

function WordOfDay() {
  const idx = Math.floor(Date.now() / 86400000) % words.length;
  const word = words[idx];

  return (
    <motion.div
      className="mt-5 rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1e1810 0%, var(--surface) 70%)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--accent)",
      }}
      {...fadeUp(0.22)}
    >
      {/* Background decoration */}
      <span
        className="absolute right-4 top-3 text-[64px] opacity-[0.04] select-none pointer-events-none"
        aria-hidden
      >
        K
      </span>

      <p
        className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
        style={{ color: "var(--accent)" }}
      >
        Word of the day
      </p>
      <p className="text-3xl font-bold leading-none mb-2">{word.rw}</p>
      <p className="text-base" style={{ color: "var(--text-muted)" }}>
        {word.en}
      </p>
      <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
        /{word.romanization}/
      </p>
      <span
        className="inline-block text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-semibold"
        style={{
          background: "rgba(200,169,110,0.1)",
          color: "var(--accent)",
          border: "1px solid rgba(200,169,110,0.2)",
        }}
      >
        {word.category}
      </span>
    </motion.div>
  );
}
