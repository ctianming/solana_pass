"use client";

import { useMemo } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { AppShell } from "@/components/AppShell";
import { PassCard } from "@/components/PassCard";
import { PriceChart, StatsGrid } from "@/components/ChartsAndStats";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { HowItWorks, FAQ } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";
import { SectionCard } from "@/components/SectionCard";
import Link from "next/link";
import { StoredAccount } from "@/lib/account";

type Lang = "en" | "zh";

// HeaderBanner imported from components

export default function Home() {
  const [lang] = useLocalStorage<Lang>("lang", "zh");
  const [account] = useLocalStorage<StoredAccount | null>("account", null);
  const t = useMemo(() => {
    const zh = {
      title: "Solana Pass",
      subtitle: "贴卡即用 · 零门槛进入 Web3",
      nfcTitle: "NFC 一贴创建账户",
      nfcDesc: "首次贴卡自动为您创建 Solana 钱包，无需助记词与复杂设置。",
  nfcBtn: "贴卡创建账户",
      fiatTitle: "法币充值与代付",
      fiatDesc: "支持法币充值，链上操作由平台代付，并从账户法币余额中扣除。",
      fiatCharge: "充值 50 元",
      fiatSpend: "发起一次链上操作（代付）",
      snsTitle: "Solana Name Service 域名",
      snsDesc: "为您的账户注册独一无二的 SNS 域名，便于收款与识别。",
      snsRegister: "注册 sns 域名",
      hubTitle: "生态聚合入口",
      hubDesc: "聚合优质 Solana 生态应用，一站式畅享服务。",
      integrations: ["支付", "游戏", "DeFi", "NFT", "社交"],
      status: "当前状态",
      createOk: "账户创建完成",
      registerOk: "域名注册完成",
      actionOk: "已代付完成一笔操作",
    };
    const en = {
      title: "Solana Pass",
      subtitle: "Tap-and-go onboarding to Web3",
      nfcTitle: "NFC onboarding",
      nfcDesc: "Create a Solana wallet on first tap. No seed phrase, no hassle.",
  nfcBtn: "Tap to create account",
      fiatTitle: "Fiat top-up & sponsored tx",
      fiatDesc: "Top up with fiat; on-chain actions are sponsored and charged from your fiat balance.",
      fiatCharge: "Top up 50 CNY",
      fiatSpend: "Perform a sponsored on-chain action",
      snsTitle: "Solana Name Service",
      snsDesc: "Register a unique SNS domain for your account.",
      snsRegister: "Register SNS domain",
      hubTitle: "Ecosystem hub",
      hubDesc: "An entry to Solana apps. One-stop experience.",
      integrations: ["Payments", "Gaming", "DeFi", "NFT", "Social"],
      status: "Status",
      createOk: "Account created",
      registerOk: "Domain registered",
      actionOk: "Sponsored action completed",
    };
    return lang === "zh" ? zh : en;
  }, [lang]);

  return (
    <AppShell>
        {/* Hero */}
        <section className="grid md:grid-cols-2 gap-8 items-center min-h-[60vh]">
          <div className="text-left">
            <div className="inline-flex mb-4">
              <span className="badge-text">{lang === "zh" ? "贴卡即用 · 零门槛" : "Tap-and-go · No friction"}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-br from-indigo-500 to-emerald-500 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>
            <div className="mt-6 space-y-3">
              <div className="feature-item">
                <span className="feature-dot">•</span>
                {lang === "zh" ? "NFC 一贴创建账户" : "Create account by NFC tap"}
              </div>
              <div className="feature-item">
                <span className="feature-dot">•</span>
                {lang === "zh" ? "法币充值与链上代付" : "Fiat top-up with sponsored tx"}
              </div>
              <div className="feature-item">
                <span className="feature-dot">•</span>
                {lang === "zh" ? "SNS 域名" : "SNS domain"}
              </div>
            </div>
            <div className="mt-6">
              <Link href="/onboarding" className="hero-btn">
                <span>{t.nfcBtn}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
          <div className="flex justify-center items-center">
            <PassCard active={!!account} name={account?.sns ?? (lang === "zh" ? "未命名" : "Unnamed")} id={account?.id ?? undefined} />
          </div>
        </section>

        {/* Price and stats mock */}
        <PriceChart title={lang === "zh" ? "平台指数" : "Platform Index"} period="24h" />

        <StatsGrid
          accounts={account ? 1 : 0}
          fiat={(account ? account.balanceFiat.toFixed(2) : "0.00") as string}
          sponsored={account?.lastSponsoredTx ? 1 : 0}
          labelAcc={lang === "zh" ? "账户" : "Accounts"}
          labelFiat={lang === "zh" ? "法币余额" : "Fiat balance"}
          labelOps={lang === "zh" ? "代付次数" : "Sponsored ops"}
          note={lang === "zh" ? "示例" : "example"}
        />

        <div className="grid gap-5 mt-10">
          <SectionCard
            title={t.nfcTitle}
            actions={
              <Link className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/onboarding">
                {t.nfcBtn}
              </Link>
            }
          >
            {t.nfcDesc}
            {account && (
              <div className="mt-3 text-xs">
                <div>• {t.createOk}</div>
                <div>• ID: <span className="font-mono">{account.id}</span></div>
                <div>• Address: <span className="font-mono break-all">{account.address}</span></div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={t.fiatTitle}
            actions={
              <Link className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/topup">
                {lang === "zh" ? "前往充值与代付" : "Go to Top-up & Sponsor"}
              </Link>
            }
          >
            {t.fiatDesc}
            {account && (
              <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border p-3">
                  <div className="text-zinc-500">Fiat</div>
                  <div className="mt-1 font-mono">{account.balanceFiat.toFixed(2)} CNY</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-zinc-500">SOL</div>
                  <div className="mt-1 font-mono">{account.balanceSol.toFixed(3)} SOL</div>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={t.snsTitle}
            actions={
              <Link className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/onboarding?sns=1">
                {t.snsRegister}
              </Link>
            }
          >
            {t.snsDesc}
            {account?.sns && <div className="mt-3 text-xs">• {t.registerOk}: <span className="font-mono">{account.sns}</span></div>}
          </SectionCard>

          <SectionCard title={t.hubTitle}>
            {t.hubDesc}
            <div className="mt-3 flex flex-wrap gap-2">
              {t.integrations.map((i) => (
                <span key={i} className="rounded-full border px-3 py-1 text-xs bg-white/50 dark:bg-zinc-800/50">
                  {i}
                </span>
              ))}
            </div>
          </SectionCard>

          {account && (
            <SectionCard title={t.status}>
              <div className="grid gap-1 text-xs">
                <div>• {t.createOk}</div>
                {account.sns && <div>• {t.registerOk}</div>}
                <div>• {t.actionOk}</div>
              </div>
            </SectionCard>
          )}
        </div>

  <FeaturesGrid lang={lang} />
    <HowItWorks
          title={lang === "zh" ? "如何开始" : "How it works"}
          steps={
            lang === "zh"
              ? ["贴卡创建账户", "充值法币", "发起代付操作", "注册 SNS 域名", "进入生态入口"]
              : ["Tap NFC to create account", "Top up with fiat", "Perform sponsored tx", "Register SNS", "Enter the ecosystem"]
          }
        />

        <FAQ
          title={lang === "zh" ? "常见问题" : "FAQ"}
          items={
            lang === "zh"
              ? [
                  { q: "需要助记词吗？", a: "不需要，采用托管式体验。" },
                  { q: "链上费用谁来付？", a: "平台代付，从法币余额扣除。" },
                  { q: "可以绑定 SNS 域名吗？", a: "可以，支持唯一的 .sol 域名。" },
                ]
              : [
                  { q: "Seed phrase required?", a: "No, it's a managed experience." },
                  { q: "Who pays fees?", a: "Sponsored by platform, charged from fiat balance." },
                  { q: "SNS support?", a: "Yes, unique .sol domain supported." },
                ]
          }
        />

        <Footer />
  </AppShell>
  );
}
