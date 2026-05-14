export const RADIO_STATIONS = [
  {
    name: "BBC Gahuzamiryango",
    description: "BBC's Kinyarwanda service",
    url: "https://www.bbc.co.uk/ws/av-embeds/articles/kinyarwanda",
    streamUrl: "https://a.files.bbci.co.uk/media/live/manifesto/audio/simulcast/hls/nonuk/quality_high/ak/bbc_gahuzamiryango.m3u8",
    logo: "BBC",
  },
  {
    name: "Radio Rwanda",
    description: "National public radio of Rwanda",
    url: "https://www.radiorwanda.rw",
    streamUrl: null,
    logo: "RR",
  },
  {
    name: "Radio 10",
    description: "Popular Kigali radio station",
    url: "https://radio10.rw",
    streamUrl: null,
    logo: "R10",
  },
];

const STORAGE_KEY = "kinya_radio";

export interface RadioPrefs {
  reminderTime: string; // "HH:MM" 24h format
  reminderEnabled: boolean;
  lastListenedDate: string;
  totalMinutes: number;
}

export function loadRadioPrefs(): RadioPrefs {
  if (typeof window === "undefined")
    return { reminderTime: "08:00", reminderEnabled: false, lastListenedDate: "", totalMinutes: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? JSON.parse(raw)
      : { reminderTime: "08:00", reminderEnabled: false, lastListenedDate: "", totalMinutes: 0 };
  } catch {
    return { reminderTime: "08:00", reminderEnabled: false, lastListenedDate: "", totalMinutes: 0 };
  }
}

export function saveRadioPrefs(prefs: RadioPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}
