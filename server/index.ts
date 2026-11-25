import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OPA_BASE_URL = "http://localhost:8181";
const OPA_POLICIES_URL = `${OPA_BASE_URL}/v1/policies`;
const OPA_VIOLATIONS_URL = `${OPA_BASE_URL}/v1/data/azure/audit/violations`;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const POLICIES_DIR = resolve(SCRIPT_DIR, "..", "policies");
const SAMPLES_DIR = resolve(SCRIPT_DIR, "..", "samples");
const DEFAULT_SAMPLE_PATH = join(SAMPLES_DIR, "storage-real.json");
const LOG_FILE_PATH = join(SCRIPT_DIR, "log.txt");

const REGO_EXTENSION = ".rego";
const TEST_FILE_SUFFIX = "_test.rego";
const REGO_CONTENT_TYPE = "text/plain";
const JSON_CONTENT_TYPE = "application/json";
const JSON_INDENT = 2;
const SEPARATOR_LINE = "-".repeat(60);
const OPA_UNREACHABLE_MESSAGE = `Could not reach OPA at ${OPA_BASE_URL} - is it running?`;

interface OpaEvaluationResponse {
    result?: unknown[];
}

function findPolicyFileNames(): string[] {
    const directoryEntries = readdirSync(POLICIES_DIR);
    const policyFileNames = directoryEntries.filter((fileName) => {
        const isRegoFile = fileName.endsWith(REGO_EXTENSION);
        const isTestFile = fileName.endsWith(TEST_FILE_SUFFIX);

        return isRegoFile && !isTestFile;
    });

    return policyFileNames;
}

async function uploadPolicy(policyFileName: string): Promise<void> {
    const policyFilePath = join(POLICIES_DIR, policyFileName);
    const regoText = readFileSync(policyFilePath, "utf8");
    const policyId = policyFileName.slice(0, -REGO_EXTENSION.length);
    const uploadUrl = `${OPA_POLICIES_URL}/${policyId}`;
    const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": REGO_CONTENT_TYPE },
        body: regoText,
    });

    if (!response.ok) {
        const responseBody = await response.text();

        throw new Error(`OPA rejected policy "${policyId}" with status ${response.status}: ${responseBody}`);
    }

    console.log(`Uploaded policy: ${policyId}`);
}

async function uploadPolicies(): Promise<void> {
    const policyFileNames = findPolicyFileNames();

    for (const policyFileName of policyFileNames) {
        await uploadPolicy(policyFileName);
    }
}

function resolveSamplePath(): string {
    const samplePathArgument = process.argv[2];

    if (!samplePathArgument) {
        return DEFAULT_SAMPLE_PATH;
    }

    const samplePath = resolve(samplePathArgument);

    return samplePath;
}

function readSampleResource(samplePath: string): unknown {
    const sampleText = readFileSync(samplePath, "utf8");
    const sampleResource = JSON.parse(sampleText);

    return sampleResource;
}

async function evaluateViolations(sampleResource: unknown): Promise<unknown[]> {
    const requestBody = JSON.stringify({ input: sampleResource });
    const response = await fetch(OPA_VIOLATIONS_URL, {
        method: "POST",
        headers: { "Content-Type": JSON_CONTENT_TYPE },
        body: requestBody,
    });

    if (!response.ok) {
        const responseBody = await response.text();

        throw new Error(`OPA evaluation failed with status ${response.status}: ${responseBody}`);
    }

    const evaluationResponse = (await response.json()) as OpaEvaluationResponse;
    const violations = evaluationResponse.result;

    // OPA omits "result" entirely when the queried rule is undefined.
    if (!violations) {
        return [];
    }

    return violations;
}

function appendResultToLog(sampleFileName: string, violations: unknown[]): void {
    const timestamp = new Date().toISOString();
    const violationsJson = JSON.stringify(violations, null, JSON_INDENT);
    const logBlock = `=== ${timestamp} ===\nSample: ${sampleFileName}\nViolations: ${violations.length}\n${violationsJson}\n${SEPARATOR_LINE}\n`;

    appendFileSync(LOG_FILE_PATH, logBlock, "utf8");
}

async function main(): Promise<void> {
    try {
        await uploadPolicies();

        const samplePath = resolveSamplePath();
        const sampleResource = readSampleResource(samplePath);
        const violations = await evaluateViolations(sampleResource);
        const sampleFileName = basename(samplePath);

        appendResultToLog(sampleFileName, violations);

        console.log(`${sampleFileName}: ${violations.length} violation(s) - appended to ${LOG_FILE_PATH}`);
    } catch (error) {
        const isNetworkFailure = error instanceof TypeError;

        if (isNetworkFailure) {
            console.error(OPA_UNREACHABLE_MESSAGE);
        } else {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(errorMessage);
        }

        process.exit(1);
    }
}

await main();
