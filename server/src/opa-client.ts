import {
    JSON_CONTENT_TYPE,
    NANOSECONDS_PER_MILLISECOND,
    OPA_AUDIT_METRICS_URL,
    OPA_EVALUATION_TIMER_KEY,
    OPA_HEALTH_URL,
    OPA_POLICIES_URL,
    REGO_CONTENT_TYPE,
} from "./constants.js";
import type { AuditEvaluation, OpaCompileError, OpaInstallResult, Violation } from "./types.js";

interface OpaPolicyModule {
    id: string;
}

interface OpaPolicyListResponse {
    result?: OpaPolicyModule[];
}

interface OpaErrorResponse {
    message?: string;
    errors?: OpaCompileError[];
}

interface OpaAuditResponse {
    result?: {
        violations?: Violation[];
        compliant?: boolean;
    };
    metrics?: Record<string, number>;
}

// OPA answers a rejected module with a JSON envelope, but a proxy or a crash can
// return plain text, so the raw body is kept as the message when parsing fails.
function parseOpaErrorResponse(responseText: string): OpaErrorResponse {
    try {
        const errorResponse = JSON.parse(responseText) as OpaErrorResponse;

        return errorResponse;
    } catch {
        return { message: responseText };
    }
}

function buildPolicyUrl(policyId: string): string {
    const policyUrl = `${OPA_POLICIES_URL}/${policyId}`;

    return policyUrl;
}

export async function checkOpaHealth(): Promise<boolean> {
    try {
        const response = await fetch(OPA_HEALTH_URL);

        return response.ok;
    } catch {
        return false;
    }
}

export async function listOpaPolicyIds(): Promise<string[]> {
    const response = await fetch(OPA_POLICIES_URL);

    if (!response.ok) {
        throw new Error(`OPA refused to list policies (status ${response.status})`);
    }

    const listResponse = (await response.json()) as OpaPolicyListResponse;
    const policyModules = listResponse.result;

    if (!policyModules) {
        return [];
    }

    const policyIds = policyModules.map((policyModule) => policyModule.id);

    return policyIds;
}

// Returns the compile errors as data rather than throwing: a rejected policy is a
// normal outcome the editor has to render, not an exception. OPA compiles before it
// installs, so a rejected module leaves the previously installed one running.
export async function installPolicy(policyId: string, regoText: string): Promise<OpaInstallResult> {
    const policyUrl = buildPolicyUrl(policyId);
    const response = await fetch(policyUrl, {
        method: "PUT",
        headers: { "Content-Type": REGO_CONTENT_TYPE },
        body: regoText,
    });

    if (response.ok) {
        return {
            isInstalled: true,
            message: `Policy "${policyId}" compiled and installed`,
            compileErrors: [],
        };
    }

    const responseText = await response.text();
    const errorResponse = parseOpaErrorResponse(responseText);
    const compileErrors = errorResponse.errors;
    const errorMessage = errorResponse.message;

    return {
        isInstalled: false,
        message: errorMessage ? errorMessage : responseText,
        compileErrors: compileErrors ? compileErrors : [],
    };
}

export async function deleteOpaPolicy(policyId: string): Promise<void> {
    const policyUrl = buildPolicyUrl(policyId);
    const response = await fetch(policyUrl, { method: "DELETE" });

    if (!response.ok) {
        throw new Error(`OPA refused to delete policy "${policyId}" (status ${response.status})`);
    }
}

export async function evaluateAudit(resource: unknown): Promise<AuditEvaluation> {
    const requestBody = JSON.stringify({ input: resource });
    const response = await fetch(OPA_AUDIT_METRICS_URL, {
        method: "POST",
        headers: { "Content-Type": JSON_CONTENT_TYPE },
        body: requestBody,
    });

    if (!response.ok) {
        const responseText = await response.text();

        throw new Error(`OPA evaluation failed with status ${response.status}: ${responseText}`);
    }

    const auditResponse = (await response.json()) as OpaAuditResponse;
    const auditData = auditResponse.result;

    if (!auditData) {
        throw new Error("OPA returned no data for package azure.audit - are the policies installed?");
    }

    const reportedViolations = auditData.violations;
    const violations = reportedViolations ? reportedViolations : [];
    const isCompliant = auditData.compliant === true;
    const metrics = auditResponse.metrics;
    const evaluationNanoseconds = metrics ? metrics[OPA_EVALUATION_TIMER_KEY] : 0;
    const evaluationMs = evaluationNanoseconds / NANOSECONDS_PER_MILLISECOND;

    return { violations, isCompliant, evaluationMs };
}
