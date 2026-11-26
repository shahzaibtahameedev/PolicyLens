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

export interface OpaInstallResult {
    isInstalled: boolean;
    message: string;
    compileErrors: OpaCompileError[];
}

export interface PolicySyncFailure {
    id: string;
    message: string;
    compileErrors: OpaCompileError[];
}

export interface PolicySyncResult {
    installedIds: string[];
    removedIds: string[];
    failedPolicies: PolicySyncFailure[];
}

export interface ResourceSummary {
    id: string;
    fileName: string;
    name: string;
    type: string;
    location: string;
    tags: Record<string, string>;
}

// Field names match what the Rego rules emit, so they stay snake_case.
export interface Violation {
    policy_id: string;
    severity: string;
    resource: string;
    resource_type: string;
    field: string;
    actual: unknown;
    message: string;
}

export interface AuditEvaluation {
    violations: Violation[];
    isCompliant: boolean;
    evaluationMs: number;
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
