import { Connection, PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram, Keypair } from '@solana/web3.js';
import { getDomainKeySync, NameRegistryState, reverseLookup as snsReverseLookup } from '@bonfida/spl-name-service';
export { deriveUidRecordPda } from './nfc';
export type { Program } from '@coral-xyz/anchor';

export type ResolveOptions = {
  endpoint: string; // RPC endpoint
};

export class SolanaSdk {
  private connection: Connection;
  private sasToken?: string;

  constructor(opts: ResolveOptions) {
    this.connection = new Connection(opts.endpoint, 'confirmed');
  }

  setSasToken(token: string) {
    this.sasToken = token;
  }

  // Utility: serialize VersionedTx to base64 for relayer submission
  serializeTxBase64(tx: VersionedTransaction): string {
    const bytes = tx.serialize();
    return Buffer.from(bytes).toString('base64');
  }

  // Build relayer request payload with SAS header (placeholder networking)
  buildRelayerRequest(params: { tx: VersionedTransaction; nonce: string; clientSig: string }) {
    const { tx, nonce, clientSig } = params;
    const txBase64 = this.serializeTxBase64(tx);
    const headers: Record<string, string> = {};
    if (this.sasToken) headers['X-SAS-JWT'] = this.sasToken;
    return { headers, body: { txBase64, nonce, clientSig } };
  }

  // SNS resolve: domain -> owner pubkey
  async resolveName(domain: string): Promise<PublicKey | null> {
    try {
      if (!domain || !domain.endsWith('.sol')) return null;
      const { pubkey } = getDomainKeySync(domain);
      const registry = await NameRegistryState.retrieve(this.connection, pubkey);
      return registry.registry.owner;
    } catch (_) {
      return null;
    }
  }

  // SNS reverse: pubkey -> primary .sol name (if set)
  async reverseLookup(pubkey: PublicKey): Promise<string | null> {
    try {
      const name = await snsReverseLookup(this.connection, pubkey);
      return name ?? null;
    } catch (_) {
      return null;
    }
  }

  // Build a versioned transaction that is friendly for sponsorship (fee payer set by relayer)
  async buildSponsoredTx(params: {
    payer: PublicKey; // logical user, may not pay fees
    ixs: Parameters<TransactionMessage['compileToV0Message']>[0][] | any[]; // list of Ixs
    priorityMicroLamports?: number; // ComputeBudget priority fee per CU
    recentBlockhash?: string; // optional pre-fetched blockhash
  }): Promise<VersionedTransaction> {
    const { payer, ixs, priorityMicroLamports, recentBlockhash } = params;

    const computeIxs = [] as any[];
    if (priorityMicroLamports && priorityMicroLamports > 0) {
      computeIxs.push(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityMicroLamports })
      );
    }

    const blockhash = recentBlockhash ?? (await this.connection.getLatestBlockhash('finalized')).blockhash;

    const message = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: blockhash,
      instructions: [...computeIxs, ...ixs],
    }).compileToV0Message();

    return new VersionedTransaction(message);
  }

  // Build create-subdomain transaction (placeholder):
  // parentDomain: e.g., brand.sol, sub: username, targetPubkey: owner to resolve
  async buildCreateSubdomainTx(_args: {
    parentDomain: string;
    sub: string;
    targetPubkey: PublicKey;
  }): Promise<VersionedTransaction> {
    // Placeholder: integrate with @bonfida/spl-name-service to create name and set record
    // The relayer will act as feePayer and possibly as authority of parent domain
    throw new Error('buildCreateSubdomainTx: not implemented');
  }
}

// Create a local ephemeral wallet (for browser or server). In production prefer wallet adapters or MPC custodial options.
export function createEphemeralKeypair(): Keypair {
  return Keypair.generate();
}
