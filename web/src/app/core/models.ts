export type SeverityLevel = "High" | "Medium" | "Low";

export type NavSection = "dashboard" | "audit" | "policies";

export type AuditSourceType = "Upload" | "Azure";

export type AuditRunStatus = "Completed" | "Failed";

export type AiDecision = "pending" | "accepted" | "kept";

export interface EditorMarker {
    row: number;
    col: number;
    message: string;
}

export interface PolicyFailureStat {
    id: string;
    title: string;
    failCount: number;
    percentWidth: number;
}

export interface RecentAuditRun {
    id: string;
    dateLabel: string;
    resourceType: string;
    source: AuditSourceType;
    resourceCount: number;
    highCount: number | null;
    mediumCount: number | null;
    lowCount: number | null;
    status: AuditRunStatus;
    failureReason?: string;
}

export interface LastScannedResource {
    shortCode: string;
    name: string;
    typeLabel: string;
    resourceGroup: string;
    scannedAtLabel: string;
    totalFindings: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
}

export interface DashboardSummary {
    updatedLabel: string;
    auditsRun: number;
    auditsThisWeek: number;
    resourcesScanned: number;
    resourceTypesCount: number;
    openFindings: number;
    highSeverityFindings: number;
    complianceRate: number;
    complianceDeltaPoints: number;
    severityCounts: {
        high: number;
        medium: number;
        low: number;
    };
    complianceTrendPoints: number[];
    complianceTrendLabels: string[];
    lastScanned: LastScannedResource;
    mostFailedPolicies: PolicyFailureStat[];
    recentRuns: RecentAuditRun[];
}

export interface AuditPolicyRule {
    id: string;
    title: string;
    severity: SeverityLevel;
    fileName: string;
}

export interface ResourceTypeOption {
    id: string;
    shortCode: string;
    name: string;
    azureType: string;
    policyCount: number;
    policyFilesLabel: string;
    isEnabled: boolean;
    policies: AuditPolicyRule[];
}

export interface UploadedResourceFile {
    id: string;
    fileName: string;
    resourceName: string;
    detectedType: string;
    detectedAzureType: string;
    sizeLabel: string;
    isMatchingType: boolean;
    mismatchReason?: string;
}

export interface AzureAccountInfo {
    initials: string;
    displayName: string;
    email: string;
    directoryName: string;
    roleLabel: string;
}

export interface AzureSubscriptionOption {
    id: string;
    name: string;
    shortId: string;
}

export interface AzureResourceRow {
    id: string;
    name: string;
    resourceGroup: string;
    location: string;
    lastModified: string;
    selected: boolean;
}

export interface AuditRunProgressRow {
    resourceName: string;
    state: "Done" | "Evaluating" | "Queued";
    note: string;
}

export interface AuditFinding {
    id: string;
    policyId: string;
    policyTitle: string;
    severity: SeverityLevel;
    resourceName: string;
    resourceType: string;
    resourceGroup: string;
    reason: string;
    explanation: string;
    fieldChecked: string;
    ruleDescription: string;
    actualJson: string;
    expectedJson: string;
    fixSummary: string;
    fixCommand: string;
    regoFilePath: string;
    regoFileName: string;
    regoLineStart: number;
    regoLineEnd: number;
    isAiJudgmentCall: boolean;
    aiConfidencePercent?: number;
    aiNote?: string;
    aiDecision: AiDecision;
}

export interface PdfResourceSummaryRow {
    name: string;
    high: number;
    medium: number;
    low: number;
    isCompliant: boolean;
}

export interface PolicyRuleItem {
    id: string;
    severity: SeverityLevel;
    title: string;
    line: number;
}

export interface PolicyFileRecord {
    id: string;
    fileName: string;
    packageName: string;
    filePath: string;
    appliesTo: string[];
    appliesToSummary: string;
    updatedDate: string;
    updatedBy: string;
    code: string;
    rules: PolicyRuleItem[];
}

export interface PolicyCoverageCard {
    resourceType: string;
    ruleCount: number;
    subtitle: string;
    hasPolicies: boolean;
}

export interface RegoValidationError {
    code: string;
    message: string;
    line: number;
    column: number;
}
