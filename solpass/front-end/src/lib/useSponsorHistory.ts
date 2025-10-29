"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SponsorHistoryItem = {
  id: string;
  kind: string;
  txId: string;
  timestamp: string;
  signers?: string[];
  memo?: string | null;
};

export type SponsorHistoryState = {
  items: SponsorHistoryItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
  configured: boolean;
};

type Options = {
  limit?: number;
  refreshIntervalMs?: number | null;
};

export function useSponsorHistory(apiBase: string, sasToken: string | null | undefined, options: Options = {}): SponsorHistoryState {
  const { limit = 25, refreshIntervalMs = null } = options;
  const [items, setItems] = useState<SponsorHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const configured = Boolean(apiBase) && Boolean(sasToken);
  const lockRef = useRef(false);

  const fetchHistory = useCallback(async () => {
    if (!configured) {
      setItems([]);
      setError(null);
      setLastUpdated(null);
      return;
    }
    if (lockRef.current) return;
    lockRef.current = true;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/sponsor/history?limit=${limit}`, {
        headers: { "X-SAS-JWT": sasToken ?? "" },
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { items?: SponsorHistoryItem[] };
      setItems(Array.isArray(json.items) ? json.items : []);
      setLastUpdated(Date.now());
    } catch (err) {
      if (!controller.signal.aborted) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setItems([]);
        setLastUpdated(Date.now());
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
      controllerRef.current = null;
      lockRef.current = false;
    }
  }, [apiBase, sasToken, configured, limit]);

  useEffect(() => {
    if (!configured) {
      setItems([]);
      setError(null);
      setLastUpdated(null);
      return undefined;
    }
    void fetchHistory();
    if (!refreshIntervalMs) return () => controllerRef.current?.abort();
    const handle = setInterval(() => {
      void fetchHistory();
    }, refreshIntervalMs);
    return () => {
      clearInterval(handle);
      controllerRef.current?.abort();
    };
  }, [configured, refreshIntervalMs, fetchHistory]);

  const refresh = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  return { items, loading, error, lastUpdated, refresh, configured };
}
