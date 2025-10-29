"use client";

import { useEffect } from "react";

export function ThemeToggle({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  return (
    <button
      aria-label="Toggle theme"
  className="fixed top-3 right-[4.5rem] z-50 rounded-full border px-3 py-2 text-sm bg-white/70 dark:bg-black/40 backdrop-blur shadow"
      onClick={() => setDark(!dark)}
    >
      {dark ? "🌙" : "☀️"}
    </button>
  );
}

export function LangToggle({ lang, setLang }: { lang: "en" | "zh"; setLang: (l: "en" | "zh") => void }) {
  return (
    <button
      aria-label="Toggle language"
  className="fixed top-3 right-3 z-50 rounded-full border px-3 py-2 text-sm bg-white/70 dark:bg-black/40 backdrop-blur shadow"
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
    >
      {lang.toUpperCase()}
    </button>
  );
}
