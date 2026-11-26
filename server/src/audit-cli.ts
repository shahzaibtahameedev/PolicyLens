import { appendFileSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import {
    DEFAULT_RESOURCE_PATH,
    JSON_INDENT,
    LOG_FILE_PATH,
    OPA_UNREACHABLE_MESSAGE,
    SEPARATOR_LINE,
} from "./constants.js";
import { evaluateAudit } from "./opa-client.js";
import { syncPoliciesToOpa } from "./policy-sync.js";
import type { AuditEvaluation } from "./types.js";

function resolveResourcePath(): string {
    const resourcePathArgument = process.argv[2];

    if (!resourcePathArgument) {
        return DEFAULT_RESOURCE_PATH;
    }

    const resourcePath = resolve(resourcePathArgument);

    return resourcePath;
}

function readResourceFile(resourcePath: string): unknown {
    const resourceText = readFileSync(resourcePath, "utf8");
    const resource = JSON.parse(resourceText);

    return resource;
}

function appendResultToLog(resourceFileName: string, evaluation: AuditEvaluation): void {
    const timestamp = new Date().toISOString();
    const violationsJson = JSON.stringify(evaluation.violations, null, JSON_INDENT);
    const verdict = evaluation.isCompliant ? "compliant" : "non-compliant";
    const logBlock = `=== ${timestamp} ===\nResource: ${resourceFileName}\nVerdict: ${verdict}\nViolations: ${evaluation.violations.length}\n${violationsJson}\n${SEPARATOR_LINE}\n`;

    appendFileSync(LOG_FILE_PATH, logBlock, "utf8");
}

async function main(): Promise<void> {
    try {
        const syncResult = await syncPoliciesToOpa();

        for (const failure of syncResult.failedPolicies) {
            console.error(`Policy "${failure.id}" did not compile: ${failure.message}`);
        }

        const hasFailedPolicies = syncResult.failedPolicies.length > 0;

        if (hasFailedPolicies) {
            process.exit(1);
        }

        const resourcePath = resolveResourcePath();
        const resource = readResourceFile(resourcePath);
        const evaluation = await evaluateAudit(resource);
        const resourceFileName = basename(resourcePath);

        appendResultToLog(resourceFileName, evaluation);

        console.log(
            `${resourceFileName}: ${evaluation.violations.length} violation(s) - appended to ${LOG_FILE_PATH}`,
        );
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
