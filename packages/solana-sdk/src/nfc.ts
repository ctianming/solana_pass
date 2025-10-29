import { PublicKey } from '@solana/web3.js';

export const UID_SEED = Buffer.from('uid');

export function deriveUidRecordPda(programId: PublicKey, uidHash: Uint8Array) {
  const [pda] = PublicKey.findProgramAddressSync([UID_SEED, Buffer.from(uidHash)], programId);
  return pda;
}
