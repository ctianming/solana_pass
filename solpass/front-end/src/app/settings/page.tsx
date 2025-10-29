"use client";

import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/SectionCard";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useAppConfig } from "@/lib/config";
import { StoredAccount } from "@/lib/account";

type Lang = "en" | "zh";

export default function SettingsPage() {
  const [lang, setLang] = useLocalStorage<Lang>("lang", "zh");
  const [dark, setDark] = useLocalStorage("theme-dark", false);
  const [, setAccount] = useLocalStorage<StoredAccount | null>("account", null);
  const { apiUrl, setApiUrl, rpcEndpoint, setRpcEndpoint, parentDomain, setParentDomain, sasToken, setSasToken } = useAppConfig();

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-5">{lang === "zh" ? "设置" : "Settings"}</h1>
      <div className="grid gap-5">
        <SectionCard title={lang === "zh" ? "服务配置" : "Service config"}>
          <div className="grid gap-3 text-sm">
            <label className="grid gap-1">
              <span className="text-zinc-500">{lang === "zh" ? "API 基地址" : "API base URL"}</span>
              <input className="rounded-lg border px-3 py-2" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="http://localhost:8788" />
            </label>
            <label className="grid gap-1">
              <span className="text-zinc-500">{lang === "zh" ? "RPC 节点" : "RPC endpoint"}</span>
              <input className="rounded-lg border px-3 py-2" value={rpcEndpoint} onChange={(e) => setRpcEndpoint(e.target.value)} placeholder="https://api.devnet.solana.com" />
            </label>
            <label className="grid gap-1">
              <span className="text-zinc-500">{lang === "zh" ? "父域名" : "Parent domain"}</span>
              <input className="rounded-lg border px-3 py-2" value={parentDomain} onChange={(e) => setParentDomain(e.target.value)} placeholder="brand.sol" />
            </label>
          </div>
        </SectionCard>

        <SectionCard title="SAS">
          <label className="grid gap-1 text-sm">
            <span className="text-zinc-500">{lang === "zh" ? "SAS 令牌" : "SAS token"}</span>
            <textarea
              className="rounded-lg border px-3 py-2 min-h-24 resize-y"
              value={sasToken}
              onChange={(e) => setSasToken(e.target.value)}
              placeholder={lang === "zh" ? "粘贴 SAS JWT" : "Paste SAS JWT"}
            />
          </label>
        </SectionCard>

        <SectionCard title={lang === "zh" ? "外观" : "Appearance"}>
          <div className="flex items-center justify-between">
            <span>{lang === "zh" ? "深色模式" : "Dark mode"}</span>
            <button className={`rounded-full border px-3 py-1 text-sm ${dark ? "bg-zinc-800 text-white" : "bg-white"}`} onClick={() => setDark(!dark)}>
              {dark ? (lang === "zh" ? "开启" : "On") : (lang === "zh" ? "关闭" : "Off")}
            </button>
          </div>
        </SectionCard>
        <SectionCard title={lang === "zh" ? "语言" : "Language"}>
          <div className="flex items-center justify-between">
            <span>{lang === "zh" ? "切换语言" : "Switch language"}</span>
            <button className="rounded-full border px-3 py-1 text-sm" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>{lang.toUpperCase()}</button>
          </div>
        </SectionCard>
        <SectionCard title={lang === "zh" ? "账户" : "Account"}>
          <div className="flex items-center justify-between">
            <span>{lang === "zh" ? "重新初始化（清除本地账户）" : "Re-initialize (clear local account)"}</span>
            <button
              className="rounded-full border px-3 py-1 text-sm hover:bg-red-50 dark:hover:bg-red-950"
              onClick={() => setAccount(null)}
            >
              {lang === "zh" ? "清除" : "Clear"}
            </button>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
