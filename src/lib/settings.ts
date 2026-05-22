import { useEffect, useState } from "react";

export interface Settings {
  theme: "light" | "dark";
  timerEnabled: boolean;
  secondsPerQuestion: number;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  questionLimit: number; // 0 = no limit
  passingScore: number; // 0-100
  showAnswerImmediately: boolean;
  soundEffects: boolean;
}

const KEY = "quiz-settings-v1";

export const defaultSettings: Settings = {
  theme: "light",
  timerEnabled: false,
  secondsPerQuestion: 60,
  shuffleQuestions: false,
  shuffleChoices: false,
  questionLimit: 0,
  passingScore: 60,
  showAnswerImmediately: false,
  soundEffects: true,
};

type Listener = (s: Settings) => void;
const listeners = new Set<Listener>();

function readStored(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

let current: Settings = defaultSettings;

export function applyThemeClass(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function getSettings(): Settings {
  return current;
}

export function setSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* ignore */ }
  applyThemeClass(current.theme);
  listeners.forEach((l) => l(current));
}

export function useSettings() {
  const [s, setS] = useState<Settings>(current);
  useEffect(() => {
    current = readStored();
    setS(current);
    applyThemeClass(current.theme);
    const l: Listener = (next) => setS(next);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return s;
}

export function toggleTheme() {
  setSettings({ theme: current.theme === "dark" ? "light" : "dark" });
}
