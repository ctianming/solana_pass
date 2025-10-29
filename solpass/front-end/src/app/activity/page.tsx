"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/SectionCard";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { StoredAccount } from "@/lib/account";
import { useAppConfig } from "@/lib/config";
import { SponsorHistoryItem, useSponsorHistory } from "@/lib/useSponsorHistory";

type Lang = "en" | "zh";

const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";

export default function ActivityPage() {
  const [lang] = useLocalStorage<Lang>("lang", "zh");
  const [account] = useLocalStorage<StoredAccount | null>("account", null);
  const { apiUrl, sasToken } = useAppConfig();
  const apiBase = useMemo(() => (apiUrl || "").replace(/\/$/, ""), [apiUrl]);
  const [autoRefresh, setAutoRefresh] = useLocalStorage<boolean>("activity-auto-refresh", true);
  const [limit, setLimit] = useState(25);

  const { items: history, loading, error, lastUpdated, refresh, configured } = useSponsorHistory(apiBase, sasToken, {
    limit,
    refreshIntervalMs: autoRefresh ? 30_000 : null,
  });

  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" }),
    [lang],
  );

  const steps = useMemo(
    () => [
      {
        id: 1,
        label: lang === "zh" ? "创建账户" : "Account created",
        done: Boolean(account),
      },
      {
        id: 2,
        label: lang === "zh" ? "充值" : "Fiat top-up",
        done: (account?.balanceFiat ?? 0) > 0,
      },
      {
        id: 3,
        label: lang === "zh" ? "代付交易" : "Sponsored transaction",
  done: history.some((item) => item.kind === "sponsor"),
      },
      {
        id: 4,
        label: lang === "zh" ? "注册 SNS" : "SNS registered",
        done: Boolean(account?.sns),
      },
    ],
    [account, history, lang],
  );

  const clusterSuffix = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  const explorerUrl = (txId: string) => `https://explorer.solana.com/tx/${txId}${clusterSuffix}`;
  const short = (value: string) => (value.length <= 10 ? value : `${value.slice(0, 4)}…${value.slice(-4)}`);
  const configuredText = lang === "zh" ? "请在“设置”页配置 API 与 SAS 令牌以加载历史记录。" : "Configure API base URL and SAS token in Settings to load history.";
  const lastUpdatedText = lastUpdated
    ? `${lang === "zh" ? "上次更新" : "Updated"}: ${timeFormatter.format(new Date(lastUpdated))}`
    : lang === "zh" ? "尚未加载" : "Not loaded yet";

  const updateLimit = (delta: number) => {
    setLimit((prev) => {
      const next = Math.max(5, Math.min(100, prev + delta));
      return next;
    });
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-5">{lang === "zh" ? "活动" : "Activity"}</h1>
      <div className="grid gap-5">
        <SectionCard title={lang === "zh" ? "进度" : "Progress"}>
          <ul className="space-y-3">
            {steps.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span>{item.label}</span>
                <span className={item.done ? "text-emerald-600" : "text-zinc-400"}>●</span>
              </li>
            ))}
          </ul>
          {!account && <div className="mt-3 text-sm">{lang === "zh" ? "暂无记录" : "No records yet"}</div>}
        </SectionCard>

        <SectionCard
          title={lang === "zh" ? "代付历史" : "Sponsored history"}
          actions={
            <div className="flex items-center gap-2">
              <button className="rounded-full border px-3 py-1 text-xs" onClick={() => setAutoRefresh(!autoRefresh)}>
                {autoRefresh ? (lang === "zh" ? "自动刷新开" : "Auto on") : (lang === "zh" ? "自动刷新关" : "Auto off")}
              </button>
              <button
                className="rounded-full border px-3 py-1 text-xs disabled:opacity-60"
                onClick={() => void refresh()}
                disabled={loading || !configured}
              >
                {loading ? (lang === "zh" ? "刷新中…" : "Refreshing…") : lang === "zh" ? "刷新" : "Refresh"}
              </button>
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <button className="rounded-full border px-2 disabled:opacity-50" onClick={() => updateLimit(-5)} disabled={limit <= 5}>
                  −
                </button>
                <span>{limit}</span>
                <button className="rounded-full border px-2 disabled:opacity-50" onClick={() => updateLimit(5)} disabled={limit >= 100}>
                  +
                </button>
              </div>
            </div>
          }
        >
          {!configured && <div className="text-sm text-amber-600">{configuredText}</div>}
          {configured && (
            <div className="mb-3 text-xs text-zinc-500">{lastUpdatedText}</div>
          )}
          {configured && loading && <div className="text-sm text-zinc-500">{lang === "zh" ? "加载中…" : "Loading…"}</div>}
          {configured && error && !loading && (
            <div className="text-sm text-red-500">{lang === "zh" ? `加载失败：${error}` : `Failed to load: ${error}`}</div>
          )}
          {configured && !loading && !error && history.length === 0 && (
            <div className="text-sm text-zinc-500">{lang === "zh" ? "暂无代付记录" : "No sponsored transactions yet."}</div>
          )}
          {history.length > 0 && (
            <ul className="mt-4 space-y-3">
              {history.map((item) => (
                <HistoryRow key={item.id} item={item} lang={lang} timeFormatter={timeFormatter} explorerUrl={explorerUrl} short={short} />
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}

function HistoryRow({
  item,
  lang,
  timeFormatter,
  explorerUrl,
  short,
}: {
  item: SponsorHistoryItem;
  lang: Lang;
  timeFormatter: Intl.DateTimeFormat;
  explorerUrl: (txId: string) => string;
  short: (value: string) => string;
}) {
  return (
    <li className="rounded-xl border p-3 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="font-medium">{lang === "zh" ? "代付交易" : "Sponsored transaction"}</div>
          <div className="text-xs text-zinc-500">{timeFormatter.format(new Date(item.timestamp))}</div>
          {item.memo && <div className="text-xs text-zinc-600 dark:text-zinc-300">{item.memo}</div>}
          {item.signers?.length ? (
            <div className="text-xs text-zinc-500">
              {lang === "zh" ? "签名者" : "Signers"}: {item.signers.map(short).join(", ")}
            </div>
          ) : null}
        </div>
        <div className="text-xs text-right">
          <a className="text-indigo-600 hover:underline" href={explorerUrl(item.txId)} target="_blank" rel="noreferrer">
            {lang === "zh" ? "查看" : "Explorer"}
          </a>
          <div className="mt-1 font-mono break-all text-zinc-500">{short(item.txId)}</div>
        </div>
      </div>
    </li>
  );
}
