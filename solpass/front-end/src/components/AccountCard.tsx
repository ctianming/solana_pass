"use client";

import { motion } from "framer-motion";

export type AccountCardProps = {
  id: string;
  address: string;
  sns?: string;
  balanceFiat?: number;
  balanceSol?: number;
  lang?: "en" | "zh";
};

export function AccountCard({ id, address, sns, balanceFiat = 0, balanceSol = 0, lang = "zh" }: AccountCardProps) {
  const label = {
    zh: { title: "账户", id: "ID", addr: "地址", sns: "域名", bal: "余额" },
    en: { title: "Account", id: "ID", addr: "Address", sns: "Domain", bal: "Balance" },
  }[lang];

  return (
    <motion.div
      className="w-full max-w-md rounded-2xl border bg-gradient-to-b from-white/60 to-white/20 dark:from-white/5 dark:to-white/0 p-5 shadow-sm backdrop-blur"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{label.title}</div>
        {sns && <div className="text-sm px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">{sns}</div>}
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex gap-2"><span className="text-neutral-500 w-16">{label.id}</span><span className="font-mono">{id}</span></div>
        <div className="flex gap-2"><span className="text-neutral-500 w-16">{label.addr}</span><span className="font-mono break-all">{address}</span></div>
        {sns && <div className="flex gap-2"><span className="text-neutral-500 w-16">{label.sns}</span><span className="font-mono">{sns}</span></div>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border p-3">
          <div className="text-neutral-500">SOL</div>
          <div className="mt-0.5 text-lg font-semibold">{balanceSol.toFixed(4)}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-neutral-500">USD</div>
          <div className="mt-0.5 text-lg font-semibold">{balanceFiat.toFixed(2)}</div>
        </div>
      </div>
    </motion.div>
  );
}
