"use client";

import { useState } from "react";
import { Buffer } from "buffer";
import { Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/SectionCard";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useAppConfig } from "@/lib/config";
import { StoredAccount, keypairFromStored, withUpdatedBalances } from "@/lib/account";

type Lang = "en" | "zh";

export default function TopupPage() {
  const [lang] = useLocalStorage<Lang>("lang", "zh");
  const [account, setAccount] = useLocalStorage<StoredAccount | null>("account", null);
  const { apiUrl, rpcEndpoint, sasToken } = useAppConfig();
  const apiBase = (apiUrl || "").replace(/\/$/, "");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [detail, setDetail] = useState<string>("");

  const topUpFiat = () => setAccount((prev) => (prev ? withUpdatedBalances(prev, 50, 0) : prev));

  const sponsoredAction = async () => {
    if (!account) return;
    if (!sasToken) {
      setStatus("error");
      setDetail(lang === "zh" ? "缺少 SAS 凭证" : "SAS token missing");
      return;
    }
    if (!apiBase) {
      setStatus("error");
      setDetail("API URL not configured");
      return;
    }
    if (account.balanceFiat <= 0) {
      setStatus("error");
      setDetail(lang === "zh" ? "余额不足，请先充值" : "Insufficient balance");
      return;
    }
    const signer = keypairFromStored(account);
    if (!signer) {
      setStatus("error");
      setDetail(lang === "zh" ? "无法恢复账户密钥" : "Failed to restore keypair");
      return;
    }

    setStatus("sending");
    setDetail("");
    try {
  const feeRes = await fetch(`${apiBase}/sponsor/fee-payer`);
      const feeJson = await feeRes.json().catch(() => ({}));
      const feePayer = feeJson?.feePayer;
      if (!feePayer) throw new Error("fee payer unavailable");
      const feePayerPk = new PublicKey(feePayer);

      const memoProgram = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
      const memo = `solpass:${signer.publicKey.toBase58()}`;
      const ix = new TransactionInstruction({
        programId: memoProgram,
        keys: [{ pubkey: signer.publicKey, isSigner: true, isWritable: false }],
        data: Buffer.from(memo, "utf8"),
      });

      const rpc = rpcEndpoint || "https://api.devnet.solana.com";
      const connection = new Connection(rpc, "confirmed");
      const { blockhash } = await connection.getLatestBlockhash("finalized");
      const msg = new TransactionMessage({ payerKey: feePayerPk, recentBlockhash: blockhash, instructions: [ix] }).compileToV0Message();
      const tx = new VersionedTransaction(msg);
      tx.sign([signer]);

      const serialized = tx.serialize();
      const txBase64 = toBase64(serialized);
      const nonce = cryptoRandom(16);

  const res = await fetch(`${apiBase}/sponsor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SAS-JWT": sasToken,
        },
        body: JSON.stringify({ txBase64, nonce }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "sponsor_failed");
      setDetail(json?.txId ? json.txId : "ok");
      setStatus("success");
      setAccount((prev) => {
        if (!prev) return prev;
        const next = withUpdatedBalances(prev, -1, 0.001);
        return {
          ...next,
          balanceFiat: Math.max(0, next.balanceFiat),
          lastSponsoredTx: typeof json?.txId === "string" ? json.txId : next.lastSponsoredTx,
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDetail(msg);
      setStatus("error");
    }
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-5">{lang === "zh" ? "法币充值与代付" : "Fiat top-up & sponsored tx"}</h1>
      <div className="grid gap-5">
        <SectionCard title={lang === "zh" ? "账户余额" : "Balance"}>
          {account ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border p-4">
                <div className="text-zinc-500">Fiat</div>
                <div className="mt-1 font-mono">{account.balanceFiat.toFixed(2)} CNY</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-zinc-500">SOL</div>
                <div className="mt-1 font-mono">{account.balanceSol.toFixed(4)} SOL</div>
              </div>
            </div>
          ) : (
            <div className="text-sm">{lang === "zh" ? "请先在“Onboarding”创建账户" : "Please create an account in Onboarding first."}</div>
          )}
        </SectionCard>

        <SectionCard
          title={lang === "zh" ? "操作" : "Actions"}
          actions={
            <div className="flex gap-2">
              <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={topUpFiat} disabled={!account}>
                {lang === "zh" ? "充值 50 元" : "Top up 50 CNY"}
              </button>
              <button className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-60" onClick={sponsoredAction} disabled={!account || status === "sending"}>
                {status === "sending" ? (lang === "zh" ? "发送中…" : "Sending…") : lang === "zh" ? "发起代付操作" : "Sponsored action"}
              </button>
            </div>
          }
        >
          {lang === "zh"
            ? "链上操作由平台代付，并从账户法币余额中扣除。"
            : "On-chain fees are sponsored and deducted from fiat balance."}
          {detail && (
            <div className={`mt-3 text-xs ${status === "error" ? "text-red-500" : "text-emerald-600"}`}>
              {status === "success" ? (lang === "zh" ? "交易已提交" : "Transaction sent") : null}
              <div className="font-mono break-all">{detail}</div>
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}

function cryptoRandom(len: number): string {
  const array = new Uint8Array(len);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < len; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64(bytes: Uint8Array): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      const segment = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode(...segment);
    }
    return window.btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}
