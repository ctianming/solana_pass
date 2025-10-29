"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/onboarding", label: "NFC", icon: "📶" },
  { href: "/topup", label: "Top-up", icon: "💳" },
  { href: "/apps", label: "Apps", icon: "🧩" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/30">
      <div className="mx-auto max-w-6xl px-2 py-1 flex items-stretch justify-between gap-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 6px)" }}>
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-xs border transition-colors ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white/70 dark:bg-zinc-900/60 border-zinc-200/60 dark:border-zinc-700/50"
              }`}
            >
              <span aria-hidden>{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
