import { createHash } from 'crypto';

export function methodDiscriminator(name: string): Buffer {
  const preimage = `global:${name}`;
  const hash = createHash('sha256').update(preimage).digest();
  return hash.subarray(0, 8);
}
