"use client";

import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);

  return [val, setVal] as const;
}
