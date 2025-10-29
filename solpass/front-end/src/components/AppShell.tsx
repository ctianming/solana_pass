"use client";

import { AnimatedLayer } from "@/components/AnimatedLayer";
import { ThemeToggle, LangToggle } from "@/components/Toggles";
import { HeaderBanner } from "@/components/Banner";
import { NavBar } from "@/components/NavBar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { useLocalStorage } from "@/lib/useLocalStorage";

type Lang = "en" | "zh";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useLocalStorage<Lang>("lang", "zh");
  const [dark, setDark] = useLocalStorage("theme-dark", false);

  return (
    <div className="relative min-h-[100svh] pb-16">
      <AnimatedLayer />
      <ThemeToggle dark={dark} setDark={setDark} />
      <LangToggle lang={lang} setLang={setLang} />
      <NavBar />
      <HeaderBanner text={lang === "zh" ? "新用户可通过 NFC 一贴创建 Solana 账户" : "Create a Solana account via NFC tap"} />
      <div className="relative mx-auto max-w-6xl p-4 md:p-6">{children}</div>
      <MobileTabBar />
    </div>
  );
}
