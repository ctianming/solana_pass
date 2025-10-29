import { createHash } from 'crypto';
export function methodDiscriminator(name) {
    const preimage = `global:${name}`;
    const hash = createHash('sha256').update(preimage).digest();
    return hash.subarray(0, 8);
}
