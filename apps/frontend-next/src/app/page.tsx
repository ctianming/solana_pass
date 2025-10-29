"use client";
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Keypair, PublicKey, Connection, TransactionMessage, VersionedTransaction, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';

export default function HomePage() {
  const [log, setLog] = useState<string[]>([]);
  const [userKey, setUserKey] = useState<Keypair | null>(null);
  const [domain, setDomain] = useState<string>('brand.sol');
  const [sub, setSub] = useState<string>('');
  const [sas, setSas] = useState<string>('');
  const [relayerUrl, setRelayerUrl] = useState<string>('http://localhost:8787');
  const [rpc, setRpc] = useState<string>('https://api.devnet.solana.com');

  const append = (m: string) => setLog((l: string[]) => [m, ...l]);

  const ensureWallet = () => {
    if (!userKey) {
      const kp = Keypair.generate();
      setUserKey(kp);
      append(`Created ephemeral wallet: ${kp.publicKey.toBase58()}`);
    }
  };

  const createSubdomain = async () => {
    if (!sub || !domain || !userKey) return append('missing fields');
    if (!sas) return append('SAS token required');
    try {
      const res = await fetch(`${relayerUrl}/names/create-subdomain`, {
        method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-SAS-JWT': sas },
  body: JSON.stringify({ parentDomain: domain, sub, targetPubkey: userKey.publicKey.toBase58() })
      });
      const json = await res.json();
      append(JSON.stringify(json));
    } catch (e: any) {
      append(`error: ${e?.message || e}`);
    }
  };

  const sendSponsored = async () => {
    if (!userKey) return append('create wallet first');
    if (!sas) return append('SAS token required');
    try {
      // Fetch relayer fee payer
      const fpRes = await fetch(`${relayerUrl}/sponsor/fee-payer`);
      const fpJson = await fpRes.json();
      if (!fpJson?.feePayer) return append('failed to fetch fee payer');
      const feePayer = new PublicKey(fpJson.feePayer);

      // Build a memo instruction requiring user signature
      const userPk = userKey.publicKey;
      const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      const memoIx = new TransactionInstruction({
        programId: memoProgramId,
        keys: [{ pubkey: userPk, isSigner: true, isWritable: false }],
        data: Buffer.from('hello from sponsored tx', 'utf8'),
      });

      // Build versioned tx with relayer as payer
      const connection = new Connection(rpc, 'confirmed');
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      const msg = new TransactionMessage({ payerKey: feePayer, recentBlockhash: blockhash, instructions: [memoIx] }).compileToV0Message();
  const tx = new VersionedTransaction(msg);
  tx.sign([userKey]);

  const bytes = tx.serialize();
  const txBase64 = toBase64(bytes);
      const nonce = cryptoRandom(16);

      const res = await fetch(`${relayerUrl}/sponsor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-SAS-JWT': sas },
        body: JSON.stringify({ txBase64, nonce, clientSig: '' })
      });
      const json = await res.json();
      append(JSON.stringify(json));
    } catch (e: any) {
      append(`error: ${e?.message || e}`);
    }
  };

  function cryptoRandom(len: number): string {
    const array = new Uint8Array(len);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < len; i++) array[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function toBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      const sub = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode.apply(null, Array.from(sub) as unknown as number[]);
    }
    return typeof window !== 'undefined' ? window.btoa(binary) : Buffer.from(bytes).toString('base64');
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h2>Subdomain Creator (Demo)</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={ensureWallet}>Create Ephemeral Wallet</button>
  <input placeholder="SAS token" value={sas} onChange={(e: ChangeEvent<HTMLInputElement>) => setSas(e.target.value)} style={{ width: 320 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
  <input placeholder="parent domain" value={domain} onChange={(e: ChangeEvent<HTMLInputElement>) => setDomain(e.target.value)} />
  <input placeholder="sub" value={sub} onChange={(e: ChangeEvent<HTMLInputElement>) => setSub(e.target.value)} />
  <input placeholder="relayer url" value={relayerUrl} onChange={(e: ChangeEvent<HTMLInputElement>) => setRelayerUrl(e.target.value)} style={{ width: 260 }} />
        <button onClick={createSubdomain}>Create Subdomain</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
  <input placeholder="rpc endpoint" value={rpc} onChange={(e: ChangeEvent<HTMLInputElement>) => setRpc(e.target.value)} style={{ width: 320 }} />
        <button onClick={sendSponsored}>Send Sponsored Memo</button>
      </div>
      <pre>{log.join('\n')}</pre>
    </main>
  );
}
