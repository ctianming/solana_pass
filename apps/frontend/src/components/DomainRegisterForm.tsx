"use client";
import { useState } from 'react';

type Resp = { accepted?: boolean; domain?: string; txId?: string; error?: string; detail?: string };

export default function DomainRegisterForm() {
  const [sub, setSub] = useState("");
  const [parent, setParent] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_PARENT_DOMAIN || "brand.sol");
  const [owner, setOwner] = useState("");
  const [sas, setSas] = useState("");
  const [relayer, setRelayer] = useState<string>(process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:8787");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`${relayer}/names/create-subdomain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-SAS-JWT': sas },
        body: JSON.stringify({ parentDomain: parent, sub, targetPubkey: owner }),
      });
      const json = (await res.json()) as Resp;
      if (!res.ok) throw new Error(json.error || 'request_failed');
      setResult(`OK: ${json.domain} -> ${json.txId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult(`ERR: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-1">
        <label className="text-sm">SAS Token</label>
        <input className="border rounded px-3 py-2" value={sas} onChange={(e) => setSas(e.target.value)} placeholder="paste SAS token" required />
      </div>
      <div className="grid gap-1">
        <label className="text-sm">Relayer URL</label>
        <input className="border rounded px-3 py-2" value={relayer} onChange={(e) => setRelayer(e.target.value)} placeholder="http://localhost:8787" required />
      </div>
      <div className="grid gap-1">
        <label className="text-sm">Parent Domain</label>
        <input className="border rounded px-3 py-2" value={parent} onChange={(e) => setParent(e.target.value)} placeholder="brand.sol" required />
      </div>
      <div className="grid gap-1">
        <label className="text-sm">Subdomain</label>
        <input className="border rounded px-3 py-2" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="alice" required />
      </div>
      <div className="grid gap-1">
        <label className="text-sm">Owner Pubkey</label>
        <input className="border rounded px-3 py-2" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="User wallet address" required />
      </div>
      <button disabled={loading} className="bg-black text-white rounded px-4 py-2 disabled:opacity-60">{loading ? 'Submitting…' : 'Create Subdomain'}</button>
      {result && <p className="text-sm">{result}</p>}
    </form>
  );
}
