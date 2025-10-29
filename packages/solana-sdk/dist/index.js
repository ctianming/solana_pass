import { Connection, TransactionMessage, VersionedTransaction, ComputeBudgetProgram, Keypair } from '@solana/web3.js';
import { getDomainKeySync, NameRegistryState, reverseLookup as snsReverseLookup } from '@bonfida/spl-name-service';
export { deriveUidRecordPda } from './nfc';
export class SolanaSdk {
    constructor(opts) {
        this.connection = new Connection(opts.endpoint, 'confirmed');
    }
    setSasToken(token) {
        this.sasToken = token;
    }
    // Utility: serialize VersionedTx to base64 for relayer submission
    serializeTxBase64(tx) {
        const bytes = tx.serialize();
        return Buffer.from(bytes).toString('base64');
    }
    // Build relayer request payload with SAS header (placeholder networking)
    buildRelayerRequest(params) {
        const { tx, nonce, clientSig } = params;
        const txBase64 = this.serializeTxBase64(tx);
        const headers = {};
        if (this.sasToken)
            headers['X-SAS-JWT'] = this.sasToken;
        return { headers, body: { txBase64, nonce, clientSig } };
    }
    // SNS resolve: domain -> owner pubkey
    async resolveName(domain) {
        try {
            if (!domain || !domain.endsWith('.sol'))
                return null;
            const { pubkey } = getDomainKeySync(domain);
            const registry = await NameRegistryState.retrieve(this.connection, pubkey);
            return registry.registry.owner;
        }
        catch (_) {
            return null;
        }
    }
    // SNS reverse: pubkey -> primary .sol name (if set)
    async reverseLookup(pubkey) {
        try {
            const name = await snsReverseLookup(this.connection, pubkey);
            return name ?? null;
        }
        catch (_) {
            return null;
        }
    }
    // Build a versioned transaction that is friendly for sponsorship (fee payer set by relayer)
    async buildSponsoredTx(params) {
        const { payer, ixs, priorityMicroLamports, recentBlockhash } = params;
        const computeIxs = [];
        if (priorityMicroLamports && priorityMicroLamports > 0) {
            computeIxs.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityMicroLamports }));
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
    async buildCreateSubdomainTx(_args) {
        // Placeholder: integrate with @bonfida/spl-name-service to create name and set record
        // The relayer will act as feePayer and possibly as authority of parent domain
        throw new Error('buildCreateSubdomainTx: not implemented');
    }
}
// Create a local ephemeral wallet (for browser or server). In production prefer wallet adapters or MPC custodial options.
export function createEphemeralKeypair() {
    return Keypair.generate();
}
