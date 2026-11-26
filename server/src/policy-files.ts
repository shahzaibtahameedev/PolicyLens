import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { POLICIES_DIR, REGO_EXTENSION, TEST_FILE_SUFFIX } from "./constants.js";
import type { PolicyFile } from "./types.js";

function buildPolicyFilePath(policyId: string): string {
    const policyFilePath = join(POLICIES_DIR, `${policyId}${REGO_EXTENSION}`);

    return policyFilePath;
}

export function readPolicyFileNames(): string[] {
    const directoryEntries = readdirSync(POLICIES_DIR);
    const policyFileNames = directoryEntries.filter((fileName) => {
        const isRegoFile = fileName.endsWith(REGO_EXTENSION);
        const isTestFile = fileName.endsWith(TEST_FILE_SUFFIX);

        return isRegoFile && !isTestFile;
    });

    return policyFileNames;
}

export function readPolicies(): PolicyFile[] {
    const policyFileNames = readPolicyFileNames();
    const policies: PolicyFile[] = [];

    for (const fileName of policyFileNames) {
        const policyFilePath = join(POLICIES_DIR, fileName);
        const text = readFileSync(policyFilePath, "utf8");
        const id = fileName.slice(0, -REGO_EXTENSION.length);

        policies.push({ id, fileName, text });
    }

    return policies;
}

export function policyFileExists(policyId: string): boolean {
    const policyFilePath = buildPolicyFilePath(policyId);
    const fileExists = existsSync(policyFilePath);

    return fileExists;
}

export function writePolicyFile(policyId: string, regoText: string): void {
    const policyFilePath = buildPolicyFilePath(policyId);

    writeFileSync(policyFilePath, regoText, "utf8");
}
