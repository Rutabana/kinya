"use client";

import { useState, useEffect, useRef } from "react";
import { ExternalLink, Bell, BellOff, ChevronLeft, Play, Square } from "lucide-react";
import Link from "next/link";
import {
  RADIO_STATIONS,
  loadRadioPrefs,
  saveRadioPrefs,
  todayDateString,
  requestNotificationPermission,
  type RadioPrefs,
} from "@/lib/radio";

const TARGET_MINUTES = 15;

export default function RadioPage() {
  const [prefs, setPrefs] = useState<RadioPrefs | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [goalDone, setGoalDone] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const goalDoneRef = useRef(false);

  useEffect(() => {
    const p = loadRadioPrefs();
    setPrefs(p);
    const today = todayDateString();
    if (p.lastListenedDate === today && p.totalMinutes >= TARGET_MINUTES) {
      goalDoneRef.current = true;
      setGoalDone(true);
      setElapsed(TARGET_MINUTES * 60);
    }
    setNotifGranted(
      typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
    );
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTimer = () => {
    setTimerRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed((s) => {
        const next = s + 1;
        if (next >= TARGET_MINUTES * 60 && !goalDoneRef.current) {
          goalDoneRef.current = true;
          setGoalDone(true);
          setPrefs((p) => {
            if (!p) return p;
            const updated = { ...p, lastListenedDate: todayDateString(), totalMinutes: TARGET_MINUTES };
            saveRadioPrefs(updated);
            return updated;
          });
        }
        return next;
      });
    }, 1000);
  };

  const stopTimer = () => {
    setTimerRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    // save partial progress
    if (prefs) {
      const mins = Math.floor(elapsed / 60);
      const updated = { ...prefs, lastListenedDate: todayDateString(), totalMinutes: mins };
      saveRadioPrefs(updated);
      setPrefs(updated);
    }
  };

  const toggleNotifs = async () => {
    if (!notifGranted) {
      const granted = await requestNotificationPermission();
      setNotifGranted(granted);
      if (granted && prefs) {
        const updated = { ...prefs, reminderEnabled: true };
        saveRadioPrefs(updated);
        setPrefs(updated);
      }
    } else {
      if (!prefs) return;
      const updated = { ...prefs, reminderEnabled: !prefs.reminderEnabled };
      saveRadioPrefs(updated);
      setPrefs(updated);
    }
  };

  const updateReminderTime = (time: string) => {
    if (!prefs) return;
    const updated = { ...prefs, reminderTime: time };
    saveRadioPrefs(updated);
    setPrefs(updated);
  };

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const progress = Math.min(elapsed / (TARGET_MINUTES * 60), 1);
  const circumference = 2 * Math.PI * 54;

  if (!prefs) return null;

  return (
    <div className="max-w-xl mx-auto px-4 pt-10 pb-6">
      <Link href="/" className="flex items-center gap-1 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <ChevronLeft size={16} /> Home
      </Link>

      <h1 className="text-2xl font-bold mb-1">Radio</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Listen for 15 minutes a day. Immersion builds fluency.
      </p>

      {/* Timer circle */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <svg width="128" height="128" className="-rotate-90">
            <circle
              cx="64" cy="64" r="54"
              fill="none"
              strokeWidth="8"
              stroke="var(--surface)"
            />
            <circle
              cx="64" cy="64" r="54"
              fill="none"
              strokeWidth="8"
              stroke={goalDone ? "var(--green)" : "var(--accent)"}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {goalDone ? "Goal done! 🎉" : `/ ${TARGET_MINUTES}:00`}
            </span>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          {!timerRunning ? (
            <button
              onClick={startTimer}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-black text-sm transition-all active:scale-95"
              style={{ background: "var(--accent)" }}
            >
              <Play size={16} fill="black" /> Start timer
            </button>
          ) : (
            <button
              onClick={stopTimer}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--red)" }}
            >
              <Square size={16} fill="var(--red)" /> Stop
            </button>
          )}
        </div>
      </div>

      {/* Stations */}
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
        Stations
      </h2>
      <div className="flex flex-col gap-3 mb-8">
        {RADIO_STATIONS.map((station) => (
          <div
            key={station.name}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
              style={{ background: "var(--surface2)", color: "var(--accent)" }}
            >
              {station.logo}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{station.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{station.description}</p>
            </div>
            <a
              href={station.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg transition-all active:scale-90"
              style={{ background: "var(--surface2)", color: "var(--text-muted)" }}
            >
              <ExternalLink size={16} />
            </a>
          </div>
        ))}
      </div>

      {/* Reminder settings */}
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
        Daily reminder
      </h2>
      <div
        className="rounded-xl p-4 flex flex-col gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Browser notification</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {notifGranted
                ? prefs.reminderEnabled
                  ? "Reminders on"
                  : "Notifications allowed — reminders off"
                : "Tap to allow notifications"}
            </p>
          </div>
          <button
            onClick={toggleNotifs}
            className="p-2.5 rounded-lg transition-all"
            style={{
              background: "var(--surface2)",
              color: prefs.reminderEnabled && notifGranted ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {prefs.reminderEnabled && notifGranted ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Reminder time</p>
          <input
            type="time"
            value={prefs.reminderTime}
            onChange={(e) => updateReminderTime(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm outline-none"
            style={{
              background: "var(--surface2)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          />
        </div>

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Note: Browser notifications only fire while the app is open. For reliable reminders, set a recurring alarm on your phone.
        </p>
      </div>
    </div>
  );
}
