"use client";

import { useLocalStorage } from "./useLocalStorage";

const DEFAULT_API = process.env.NEXT_PUBLIC_SOLANA_API_URL || "http://localhost:8788";
const DEFAULT_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";
const DEFAULT_PARENT = process.env.NEXT_PUBLIC_DEFAULT_PARENT_DOMAIN || "brand.sol";

export function useAppConfig() {
  const [apiUrl, setApiUrl] = useLocalStorage<string>("solpass-api-url", DEFAULT_API);
  const [rpcEndpoint, setRpcEndpoint] = useLocalStorage<string>("solpass-rpc-endpoint", DEFAULT_RPC);
  const [parentDomain, setParentDomain] = useLocalStorage<string>("solpass-parent-domain", DEFAULT_PARENT);
  const [sasToken, setSasToken] = useLocalStorage<string>("solpass-sas-token", "");

  return {
    apiUrl,
    setApiUrl,
    rpcEndpoint,
    setRpcEndpoint,
    parentDomain,
    setParentDomain,
    sasToken,
    setSasToken,
  } as const;
}