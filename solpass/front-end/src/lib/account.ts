"use client";

import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export type StoredAccount = {
  id: string;
  address: string;
  secretKey: string;
  balanceFiat: number;
  balanceSol: number;
  sns?: string;
  lastSponsoredTx?: string;
};

export function generateStoredAccount(label?: string): StoredAccount {
  const kp = Keypair.generate();
  const id = label ?? kp.publicKey.toBase58().slice(0, 8);
  return {
    id,
    address: kp.publicKey.toBase58(),
    secretKey: bs58.encode(kp.secretKey),
    balanceFiat: 0,
    balanceSol: 0,
  };
}

export async function deriveStoredAccount(seed: string): Promise<StoredAccount> {
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  let digest: Uint8Array | null = null;
  if (typeof crypto !== "undefined" && crypto.subtle?.digest) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    digest = new Uint8Array(buf);
  }
  const fallback = new Uint8Array(32);
  fallback.set(data.slice(0, 32));
  const base = digest ?? fallback;
  const kp = Keypair.fromSeed(base.slice(0, 32));
  const id = kp.publicKey.toBase58().slice(0, 8);
  return {
    id,
    address: kp.publicKey.toBase58(),
    secretKey: bs58.encode(kp.secretKey),
    balanceFiat: 0,
    balanceSol: 0,
  };
}

export function keypairFromStored(account: StoredAccount | null): Keypair | null {
  if (!account?.secretKey) return null;
  try {
    const secret = bs58.decode(account.secretKey);
    return Keypair.fromSecretKey(secret);
  } catch {
    return null;
  }
}

export function withUpdatedBalances(account: StoredAccount, deltaFiat: number, deltaSol: number): StoredAccount {
  return {
    ...account,
    balanceFiat: account.balanceFiat + deltaFiat,
    balanceSol: account.balanceSol + deltaSol,
  };
}