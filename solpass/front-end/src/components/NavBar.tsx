"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/topup", label: "Top-up" },
  { href: "/sns", label: "SNS" },
  { href: "/apps", label: "Apps" },
  { href: "/activity", label: "Activity" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/30 border-b border-black/5 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3 overflow-x-auto">
        <div className="font-semibold">Solana Pass</div>
        <div className="flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 whitespace-nowrap transition-colors border ${
                  active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white/70 dark:bg-zinc-900/60 border-zinc-200/60 dark:border-zinc-700/50 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
