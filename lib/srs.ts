export interface Word {
  id: number;
  rw: string;
  en: string;
  romanization: string;
  category: string;
}

export interface ReviewCard {
  wordId: number;
  interval: number;       // days until next review
  easeFactor: number;     // 1.3 – 2.5
  repetitions: number;
  nextReviewAt: number;   // unix ms
  lastReviewedAt: number;
}

export interface ReviewState {
  cards: Record<number, ReviewCard>;
  dailyStats: Record<string, { reviewed: number; newCards: number }>;
}

const STORAGE_KEY = "kinya_srs_state";

export function loadState(): ReviewState {
  if (typeof window === "undefined") return { cards: {}, dailyStats: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { cards: {}, dailyStats: {} };
  } catch {
    return { cards: {}, dailyStats: {} };
  }
}

export function saveState(state: ReviewState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// SM-2 algorithm
// quality: 0 = complete blackout, 1 = wrong, 2 = wrong but familiar,
//          3 = correct with difficulty, 4 = correct, 5 = perfect
export function applyReview(card: ReviewCard, quality: number): ReviewCard {
  const q = Math.max(0, Math.min(5, quality));
  let { interval, easeFactor, repetitions } = card;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  const nextReviewAt = Date.now() + interval * 24 * 60 * 60 * 1000;

  return { ...card, interval, easeFactor, repetitions, nextReviewAt, lastReviewedAt: Date.now() };
}

export function newCard(wordId: number): ReviewCard {
  return {
    wordId,
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewAt: Date.now(),
    lastReviewedAt: 0,
  };
}

export function getDueCards(state: ReviewState, allWords: Word[], limit = 20): Word[] {
  const now = Date.now();
  const due: Word[] = [];

  // First: cards already in system that are due
  for (const word of allWords) {
    const card = state.cards[word.id];
    if (card && card.nextReviewAt <= now) {
      due.push(word);
    }
    if (due.length >= limit) break;
  }

  // Then: new cards (never seen before) to fill up to limit
  for (const word of allWords) {
    if (due.length >= limit) break;
    if (!state.cards[word.id]) {
      due.push(word);
    }
  }

  return due;
}

export function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export function getTodayStats(state: ReviewState) {
  const key = todayKey();
  return state.dailyStats[key] ?? { reviewed: 0, newCards: 0 };
}

export function getTotalLearned(state: ReviewState): number {
  return Object.values(state.cards).filter((c) => c.repetitions >= 1).length;
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
