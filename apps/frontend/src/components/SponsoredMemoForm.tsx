"use client";
import { useMemo, useState } from 'react';
import { Buffer } from 'buffer';
import { Connection, Keypair, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';

export default function SponsoredMemoForm() {
  const [relayer, setRelayer] = useState<string>(process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:8787");
  const [rpc, setRpc] = useState<string>(process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com");
  const [sas, setSas] = useState("");
  const [note, setNote] = useState("hello from sponsored tx");
  const [user, setUser] = useState<Keypair>(() => Keypair.generate());
  const [result, setResult] = useState<string>("");
  const userPub = useMemo(() => user.publicKey.toBase58(), [user]);

  const refreshKey = () => setUser(Keypair.generate());

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    setResult("");
    try {
      // Fetch fee payer
      const fpRes = await fetch(`${relayer}/sponsor/fee-payer`);
      const { feePayer } = await fpRes.json();
      if (!feePayer) throw new Error('fee payer unavailable');
      const feePayerPk = new PublicKey(feePayer);

      // Build memo ix signed by user
      const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  const data = Buffer.from(note || '', 'utf8');
  const ix = new TransactionInstruction({ programId: memoProgramId, keys: [{ pubkey: user.publicKey, isSigner: true, isWritable: false }], data });

      const connection = new Connection(rpc, 'confirmed');
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      const msg = new TransactionMessage({ payerKey: feePayerPk, recentBlockhash: blockhash, instructions: [ix] }).compileToV0Message();
      const tx = new VersionedTransaction(msg);
      tx.sign([user]);

      const bytes = tx.serialize();
      const txBase64 = toBase64(bytes);
      const nonce = cryptoRandom(16);

      const res = await fetch(`${relayer}/sponsor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-SAS-JWT': sas },
        body: JSON.stringify({ txBase64, nonce, clientSig: '' })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'sponsor_failed');
      setResult(`OK ${json.txId}`);
    } catch (e: any) {
      setResult(`ERR ${e?.message || e}`);
    }
  }

  return (
    <form onSubmit={onSend} className="space-y-3">
      <div className="grid gap-1">
        <label className="text-sm">SAS Token</label>
        <input className="border rounded px-3 py-2" value={sas} onChange={(e) => setSas(e.target.value)} placeholder="paste SAS token" required />
      </div>
      <div className="grid gap-1">
        <label className="text-sm">Relayer URL</label>
        <input className="border rounded px-3 py-2" value={relayer} onChange={(e) => setRelayer(e.target.value)} placeholder="http://localhost:8787" required />
      </div>
      <div className="grid gap-1">
        <label className="text-sm">RPC Endpoint</label>
        <input className="border rounded px-3 py-2" value={rpc} onChange={(e) => setRpc(e.target.value)} placeholder="https://api.devnet.solana.com" required />
      </div>
      <div className="grid gap-1">
        <label className="text-sm">User (ephemeral) Public Key</label>
        <div className="flex items-center gap-2">
          <input readOnly className="border rounded px-3 py-2 w-full" value={userPub} />
          <button type="button" onClick={refreshKey} className="px-3 py-2 border rounded">New</button>
        </div>
      </div>
      <div className="grid gap-1">
        <label className="text-sm">Memo Text</label>
        <input className="border rounded px-3 py-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="hello" />
      </div>
      <button className="bg-black text-white rounded px-4 py-2">Send Sponsored Memo</button>
      {result && <p className="text-sm">{result}</p>}
    </form>
  );
}

function cryptoRandom(len: number): string {
  const array = new Uint8Array(len);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < len; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      const sub = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode.apply(null, Array.from(sub) as unknown as number[]);
    }
    return window.btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}
