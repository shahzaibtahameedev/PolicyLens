export interface HealthStatus {
    isOpaReachable: boolean;
    policyCount: number;
    resourceCount: number;
}

export interface PolicyFile {
    id: string;
    fileName: string;
    text: string;
}

export interface OpaErrorLocation {
    file?: string;
    row: number;
    col: number;
}

export interface OpaCompileError {
    code: string;
    message: string;
    location?: OpaErrorLocation;
}

export interface SavePolicyResponse {
    id: string;
    message: string;
}

export interface ApiErrorBody {
    message?: string;
    errors?: OpaCompileError[];
}

export interface SaveFailure {
    message: string;
    compileErrors: OpaCompileError[];
}

export interface PolicySyncResult {
    installedIds: string[];
    removedIds: string[];
    failedPolicies: { id: string; message: string }[];
}

export interface ResourceSummary {
    id: string;
    fileName: string;
    name: string;
    type: string;
    location: string;
    tags: Record<string, string>;
}

// Field names come from the Rego rules, so they stay snake_case.
export interface Violation {
    policy_id: string;
    severity: string;
    resource: string;
    resource_type: string;
    field: string;
    actual: unknown;
    message: string;
}

export interface AuditResult {
    resourceId: string;
    resourceName: string;
    resourceType: string;
    isCompliant: boolean;
    violations: Violation[];
    evaluationMs: number;
    evaluatedAt: string;
}

export interface EditorMarker {
    row: number;
    col: number;
    message: string;
}
