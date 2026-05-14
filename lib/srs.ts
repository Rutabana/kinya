export interface Word {
  id: number;
  rw: string;
  en: string;
  romanization: string;
  category: string;
}

// ─── Card phases ────────────────────────────────────────────────────────────
// new      → never seen
// learning → working through the 4 learning steps (6h → 1d → 1mo → 1yr)
// review   → graduated; SM-2 schedules long-term reviews
export type CardPhase = "new" | "learning" | "review";

// The 4 learning steps in milliseconds
export const LEARNING_STEPS_MS = [
  6 * 60 * 60 * 1000,          // 6 hours
  24 * 60 * 60 * 1000,         // 1 day
  30 * 24 * 60 * 60 * 1000,    // 1 month
  365 * 24 * 60 * 60 * 1000,   // 1 year
];

// Labels for the UI
export const STEP_LABELS = ["6h", "1d", "1mo", "1yr"];

export interface ReviewCard {
  wordId: number;
  phase: CardPhase;
  stepIndex: number;    // 0-3 during learning; irrelevant during review
  interval: number;     // days, used only in review phase (SM-2)
  easeFactor: number;   // 1.3 – 2.5, SM-2 ease
  repetitions: number;  // successive correct reviews in review phase
  lapses: number;       // times forgotten while in review phase
  nextReviewAt: number; // unix ms — when to show next
  lastReviewedAt: number;
}

// ─── State ───────────────────────────────────────────────────────────────────
export interface ReviewState {
  cards: Record<number, ReviewCard>;
  dailyStats: Record<string, { reviewed: number; newCards: number }>;
}

const STORAGE_KEY = "kinya_srs_v2";

export function loadState(): ReviewState {
  if (typeof window === "undefined") return { cards: {}, dailyStats: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Migrate from old key if needed
    if (!raw) {
      const old = localStorage.getItem("kinya_srs_state");
      if (old) {
        const parsed = JSON.parse(old);
        // Old format had no phase; treat all cards as 'review'
        const migrated: ReviewState = { cards: {}, dailyStats: parsed.dailyStats ?? {} };
        for (const [id, card] of Object.entries(parsed.cards ?? {})) {
          const c = card as Partial<ReviewCard>;
          migrated.cards[Number(id)] = {
            wordId: Number(id),
            phase: "review",
            stepIndex: 3,
            interval: (c as { interval?: number }).interval ?? 1,
            easeFactor: (c as { easeFactor?: number }).easeFactor ?? 2.5,
            repetitions: (c as { repetitions?: number }).repetitions ?? 1,
            lapses: 0,
            nextReviewAt: (c as { nextReviewAt?: number }).nextReviewAt ?? Date.now(),
            lastReviewedAt: (c as { lastReviewedAt?: number }).lastReviewedAt ?? Date.now(),
          };
        }
        saveState(migrated);
        return migrated;
      }
      return { cards: {}, dailyStats: {} };
    }
    return JSON.parse(raw);
  } catch {
    return { cards: {}, dailyStats: {} };
  }
}

export function saveState(state: ReviewState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Core algorithm ──────────────────────────────────────────────────────────
// Ratings: 0=Again  1=Hard  2=Good  3=Easy
export function applyReview(card: ReviewCard, rating: 0 | 1 | 2 | 3): ReviewCard {
  const now = Date.now();
  let { phase, stepIndex, interval, easeFactor, repetitions, lapses } = card;

  if (phase === "new" || phase === "learning") {
    if (rating === 0 || rating === 1) {
      // Wrong or hard → reset to step 0 (6h)
      phase = "learning";
      stepIndex = 0;
    } else if (rating === 2) {
      // Good → advance one step
      stepIndex = Math.min(stepIndex + 1, LEARNING_STEPS_MS.length - 1);
      phase = "learning";
    } else {
      // Easy → jump straight to review phase at 1-year interval
      phase = "review";
      interval = 365;
      easeFactor = Math.min(2.5, easeFactor + 0.15);
    }
  } else {
    // review phase: SM-2
    if (rating === 0) {
      // Forgotten → demote back to learning step 0
      phase = "learning";
      stepIndex = 0;
      lapses += 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    } else if (rating === 1) {
      // Hard → shorter interval, lower ease
      interval = Math.max(1, Math.round(interval * 1.2));
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      repetitions += 1;
    } else if (rating === 2) {
      // Good → standard SM-2
      interval = Math.max(1, Math.round(interval * easeFactor));
      repetitions += 1;
    } else {
      // Easy → longer interval, higher ease
      interval = Math.max(1, Math.round(interval * easeFactor * 1.3));
      easeFactor = Math.min(2.5, easeFactor + 0.15);
      repetitions += 1;
    }
  }

  const nextReviewAt =
    phase === "learning"
      ? now + LEARNING_STEPS_MS[stepIndex]
      : now + interval * 24 * 60 * 60 * 1000;

  return {
    ...card,
    phase,
    stepIndex,
    interval,
    easeFactor,
    repetitions,
    lapses,
    nextReviewAt,
    lastReviewedAt: now,
  };
}

export function newCard(wordId: number): ReviewCard {
  return {
    wordId,
    phase: "new",
    stepIndex: 0,
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    nextReviewAt: Date.now(),
    lastReviewedAt: 0,
  };
}

// ─── Queue building ──────────────────────────────────────────────────────────
const MAX_NEW_PER_DAY = 10;

export interface Queue {
  learning: Word[];
  review: Word[];
  newWords: Word[];
}

export function buildQueue(state: ReviewState, allWords: Word[]): Queue {
  const now = Date.now();
  const todayNewCount = getTodayStats(state).newCards;
  const newBudget = Math.max(0, MAX_NEW_PER_DAY - todayNewCount);

  const learning: Word[] = [];
  const review: Word[] = [];
  const newWords: Word[] = [];

  for (const word of allWords) {
    const card = state.cards[word.id];
    if (!card) {
      if (newWords.length < newBudget) newWords.push(word);
    } else if (card.phase === "learning" && card.nextReviewAt <= now) {
      learning.push(word);
    } else if (card.phase === "review" && card.nextReviewAt <= now) {
      review.push(word);
    }
  }

  // Sort review cards: lowest ease factor first (harder cards get priority)
  review.sort((a, b) => {
    const ea = state.cards[a.id]?.easeFactor ?? 2.5;
    const eb = state.cards[b.id]?.easeFactor ?? 2.5;
    return ea - eb;
  });

  // For new words: interleave categories rather than front-loading one category.
  // Order by the difficulty of their category (avg ease of known cards in that category).
  const categoryDifficulty = getCategoryDifficulty(state, allWords);
  newWords.sort((a, b) => {
    const da = categoryDifficulty[a.category] ?? 2.5;
    const db = categoryDifficulty[b.category] ?? 2.5;
    return da - db; // harder categories first
  });

  return { learning, review, newWords };
}

// Harder categories (lower avg ease) get surfaced first for new cards
function getCategoryDifficulty(state: ReviewState, allWords: Word[]): Record<string, number> {
  const sums: Record<string, { total: number; count: number }> = {};
  for (const word of allWords) {
    const card = state.cards[word.id];
    if (card && card.phase === "review") {
      if (!sums[word.category]) sums[word.category] = { total: 0, count: 0 };
      sums[word.category].total += card.easeFactor;
      sums[word.category].count += 1;
    }
  }
  const result: Record<string, number> = {};
  for (const [cat, { total, count }] of Object.entries(sums)) {
    result[cat] = total / count;
  }
  return result;
}

// Flat session queue: learning first (most urgent), then review, then new
export function getFlatQueue(state: ReviewState, allWords: Word[]): Word[] {
  const { learning, review, newWords } = buildQueue(state, allWords);
  return [...learning, ...review, ...newWords];
}

// ─── Stats helpers ────────────────────────────────────────────────────────────
export function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export function getTodayStats(state: ReviewState) {
  return state.dailyStats[todayKey()] ?? { reviewed: 0, newCards: 0 };
}

export function getTotalLearned(state: ReviewState): number {
  return Object.values(state.cards).filter((c) => c.repetitions >= 1 || c.phase === "review").length;
}

export function getStreak(state: ReviewState): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const stats = state.dailyStats[key];
    if (stats && stats.reviewed > 0) streak++;
    else if (i > 0) break;
  }
  return streak;
}

// ─── Label helpers ────────────────────────────────────────────────────────────
// What interval label to show on each rating button, given current card state
export function ratingLabels(card: ReviewCard | null): [string, string, string, string] {
  if (!card || card.phase === "new" || card.phase === "learning") {
    const nextStep = Math.min((card?.stepIndex ?? 0) + 1, LEARNING_STEPS_MS.length - 1);
    return [
      STEP_LABELS[0],           // Again → always 6h
      STEP_LABELS[0],           // Hard  → 6h (reset)
      STEP_LABELS[nextStep],    // Good  → next step
      STEP_LABELS[STEP_LABELS.length - 1], // Easy → 1yr
    ];
  }
  // review phase
  const { interval, easeFactor } = card;
  const hard = Math.max(1, Math.round(interval * 1.2));
  const good = Math.max(1, Math.round(interval * easeFactor));
  const easy = Math.max(1, Math.round(interval * easeFactor * 1.3));
  return [
    STEP_LABELS[0],         // Again → 6h
    formatDays(hard),       // Hard
    formatDays(good),       // Good
    formatDays(easy),       // Easy
  ];
}

function formatDays(days: number): string {
  if (days >= 365) return `${Math.round(days / 365)}yr`;
  if (days >= 30) return `${Math.round(days / 30)}mo`;
  return `${days}d`;
}
