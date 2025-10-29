/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type Props = {
  address: string;
  name?: string | null;
  className?: string;
  lang?: "en" | "zh";
};

export function FlippablePassCard({ address, name, className = "", lang = "zh" }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const gen = async () => {
      try {
        const url = await QRCode.toDataURL(address, { width: 320, margin: 1 });
        if (mounted) setQr(url);
      } catch {}
    };
    gen();
    return () => {
      mounted = false;
    };
  }, [address]);

  const display = useMemo(() => {
    if (name) return name;
    if (!address) return lang === "zh" ? "未命名" : "Unnamed";
    return `${address.slice(0, 6)}…${address.slice(-6)}`;
  }, [name, address, lang]);

  return (
  <div className={`[perspective:1200px] ${className}`}>
      <div
    className="relative h-96 w-64 sm:h-[28rem] sm:w-80 md:h-[32rem] md:w-96 [transform-style:preserve-3d] transition-transform duration-500 cursor-pointer"
        onClick={() => setFlipped((v) => !v)}
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
    <div className="absolute inset-0 rounded-3xl border bg-gradient-to-br from-emerald-400/70 to-indigo-400/70 dark:from-emerald-500/20 dark:to-indigo-500/20 shadow-2xl p-6 [backface-visibility:hidden]">
          <div className="flex h-full flex-col justify-between">
            <div className="text-sm opacity-80">Solana Pass</div>
      <div className="text-3xl md:text-4xl font-extrabold tracking-wide">
              {display}
            </div>
      <div className="text-xs opacity-80">{lang === "zh" ? "轻触翻转，查看二维码" : "Tap to flip for QR"}</div>
          </div>
        </div>

        {/* Back */}
    <div className="absolute inset-0 rounded-3xl border bg-white dark:bg-neutral-900 shadow-2xl p-6 grid place-items-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
          {qr ? (
      <img src={qr} alt="QR" className="h-72 w-72 object-contain" />
          ) : (
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-300 border-t-transparent" />
          )}
        </div>
      </div>
    </div>
  );
}
