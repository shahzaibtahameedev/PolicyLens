import { SAFE_ID_PATTERN } from "./constants.js";

export function isSafeId(candidateId: string): boolean {
    const isSafe = SAFE_ID_PATTERN.test(candidateId);

    return isSafe;
}
