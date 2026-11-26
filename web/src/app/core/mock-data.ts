import type {
    AuditFinding,
    AuditRunProgressRow,
    AzureAccountInfo,
    AzureResourceRow,
    AzureSubscriptionOption,
    DashboardSummary,
    PdfResourceSummaryRow,
    PolicyCoverageCard,
    PolicyFileRecord,
    ResourceTypeOption,
    UploadedResourceFile,
} from "./models";

const COMPLIANCE_TREND_POINTS: number[] = Array.from({ length: 30 }, (_, index) => {
    if (index === 29) {
        return 81.4;
    }

    const base = 76.2 + (5.2 * index) / 29;
    const wave = Math.sin(index * 1.7) * 0.8;
    const dip = index % 7 === 3 ? -1.1 : 0;

    return Number((base + wave + dip).toFixed(1));
});

export const INITIAL_DASHBOARD_SUMMARY: DashboardSummary = {
    updatedLabel: "Updated today at 09:42",
    auditsRun: 48,
    auditsThisWeek: 6,
    resourcesScanned: 312,
    resourceTypesCount: 3,
    openFindings: 87,
    highSeverityFindings: 21,
    complianceRate: 81.4,
    complianceDeltaPoints: 5.2,
    severityCounts: {
        high: 21,
        medium: 39,
        low: 27,
    },
    complianceTrendPoints: COMPLIANCE_TREND_POINTS,
    complianceTrendLabels: ["Oct 28", "Nov 4", "Nov 11", "Nov 18", "Nov 26"],
    lastScanned: {
        shortCode: "SA",
        name: "stgprodassets01",
        typeLabel: "Storage Account",
        resourceGroup: "rg-prod-weu-01",
        scannedAtLabel: "Today, 09:42",
        totalFindings: 5,
        highCount: 2,
        mediumCount: 2,
        lowCount: 1,
    },
    mostFailedPolicies: [
        {
            id: "04",
            title: "Anonymous public access to blobs must be disabled",
            failCount: 14,
            percentWidth: 100,
        },
        {
            id: "05",
            title: "Network access must be denied by default",
            failCount: 12,
            percentWidth: 85.7,
        },
        {
            id: "01",
            title: "Every resource must have Owner and Environment tags",
            failCount: 11,
            percentWidth: 78.6,
        },
        {
            id: "06",
            title: "Access keys must be rotated at least every 90 days",
            failCount: 9,
            percentWidth: 64.3,
        },
        {
            id: "03",
            title: "Storage accounts must require TLS 1.2 or higher",
            failCount: 7,
            percentWidth: 50,
        },
    ],
    recentRuns: [
        {
            id: "run-01",
            dateLabel: "Nov 26, 2026 09:42",
            resourceType: "Storage Account",
            source: "Upload",
            resourceCount: 4,
            highCount: 6,
            mediumCount: 4,
            lowCount: 2,
            status: "Completed",
        },
        {
            id: "run-02",
            dateLabel: "Nov 25, 2026 16:10",
            resourceType: "Function App",
            source: "Azure",
            resourceCount: 7,
            highCount: 2,
            mediumCount: 3,
            lowCount: 1,
            status: "Completed",
        },
        {
            id: "run-03",
            dateLabel: "Nov 25, 2026 11:03",
            resourceType: "Logic App",
            source: "Azure",
            resourceCount: 3,
            highCount: 0,
            mediumCount: 2,
            lowCount: 0,
            status: "Completed",
        },
        {
            id: "run-04",
            dateLabel: "Nov 24, 2026 14:27",
            resourceType: "Storage Account",
            source: "Azure",
            resourceCount: 12,
            highCount: 4,
            mediumCount: 6,
            lowCount: 3,
            status: "Completed",
        },
        {
            id: "run-05",
            dateLabel: "Nov 22, 2026 10:15",
            resourceType: "Function App",
            source: "Upload",
            resourceCount: 2,
            highCount: null,
            mediumCount: null,
            lowCount: null,
            status: "Failed",
            failureReason: "OPA not reachable",
        },
        {
            id: "run-06",
            dateLabel: "Nov 21, 2026 08:50",
            resourceType: "Storage Account",
            source: "Upload",
            resourceCount: 1,
            highCount: 0,
            mediumCount: 0,
            lowCount: 0,
            status: "Completed",
        },
    ],
};

export const RESOURCE_TYPE_OPTIONS: ResourceTypeOption[] = [
    {
        id: "storage",
        shortCode: "SA",
        name: "Storage Account",
        azureType: "Microsoft.Storage/storageAccounts",
        policyCount: 7,
        policyFilesLabel: "storage.rego · tagging.rego",
        isEnabled: true,
        policies: [
            {
                id: "01",
                title: "Every resource must have Owner and Environment tags",
                severity: "Medium",
                fileName: "tagging.rego",
            },
            {
                id: "02",
                title: "Storage accounts must accept HTTPS traffic only",
                severity: "High",
                fileName: "storage.rego",
            },
            {
                id: "03",
                title: "Storage accounts must require TLS 1.2 or higher",
                severity: "High",
                fileName: "storage.rego",
            },
            {
                id: "04",
                title: "Anonymous public access to blobs must be disabled",
                severity: "High",
                fileName: "storage.rego",
            },
            {
                id: "05",
                title: "Network access must be denied by default",
                severity: "High",
                fileName: "storage.rego",
            },
            {
                id: "06",
                title: "Access keys must be rotated at least every 90 days",
                severity: "Medium",
                fileName: "storage.rego",
            },
            {
                id: "07",
                title: "The portal should default to Entra ID authentication",
                severity: "Low",
                fileName: "storage.rego",
            },
        ],
    },
    {
        id: "function-app",
        shortCode: "FA",
        name: "Function App",
        azureType: "Microsoft.Web/sites (functionapp)",
        policyCount: 4,
        policyFilesLabel: "functions.rego · tagging.rego",
        isEnabled: true,
        policies: [
            {
                id: "01",
                title: "Every resource must have Owner and Environment tags",
                severity: "Medium",
                fileName: "tagging.rego",
            },
            {
                id: "08",
                title: "Function apps must enforce HTTPS-only requests",
                severity: "High",
                fileName: "functions.rego",
            },
            {
                id: "09",
                title: "Function apps must use a system-assigned or user-assigned managed identity",
                severity: "Medium",
                fileName: "functions.rego",
            },
            {
                id: "10",
                title: "Remote debugging must be disabled in production",
                severity: "Low",
                fileName: "functions.rego",
            },
        ],
    },
    {
        id: "logic-app",
        shortCode: "LA",
        name: "Logic App",
        azureType: "Microsoft.Logic/workflows",
        policyCount: 1,
        policyFilesLabel: "tagging.rego",
        isEnabled: true,
        policies: [
            {
                id: "01",
                title: "Every resource must have Owner and Environment tags",
                severity: "Medium",
                fileName: "tagging.rego",
            },
        ],
    },
    {
        id: "app-service",
        shortCode: "AS",
        name: "App Service",
        azureType: "Microsoft.Web/sites",
        policyCount: 0,
        policyFilesLabel: "No policies yet",
        isEnabled: false,
        policies: [],
    },
];

export const INITIAL_UPLOADED_FILES: UploadedResourceFile[] = [
    {
        id: "up-1",
        fileName: "stgprodassets01.json",
        resourceName: "stgprodassets01",
        detectedType: "Storage Account",
        detectedAzureType: "Microsoft.Storage/storageAccounts",
        sizeLabel: "4.2 KB",
        isMatchingType: true,
    },
    {
        id: "up-2",
        fileName: "stgbackups02.json",
        resourceName: "stgbackups02",
        detectedType: "Storage Account",
        detectedAzureType: "Microsoft.Storage/storageAccounts",
        sizeLabel: "3.8 KB",
        isMatchingType: true,
    },
    {
        id: "up-3",
        fileName: "stglogsweu01.json",
        resourceName: "stglogsweu01",
        detectedType: "Storage Account",
        detectedAzureType: "Microsoft.Storage/storageAccounts",
        sizeLabel: "3.1 KB",
        isMatchingType: true,
    },
    {
        id: "up-4",
        fileName: "stgarchive03.json",
        resourceName: "stgarchive03",
        detectedType: "Storage Account",
        detectedAzureType: "Microsoft.Storage/storageAccounts",
        sizeLabel: "2.9 KB",
        isMatchingType: true,
    },
    {
        id: "up-5",
        fileName: "func-orders-prod.json",
        resourceName: "func-orders-prod",
        detectedType: "Function App",
        detectedAzureType: "Microsoft.Web/sites",
        sizeLabel: "5.6 KB",
        isMatchingType: false,
        mismatchReason:
            "This file contains a Function App (Microsoft.Web/sites), but this audit checks Storage Accounts. Remove it, or start a Function App audit instead.",
    },
];

export const AZURE_ACCOUNT: AzureAccountInfo = {
    initials: "MK",
    displayName: "Maya Kessler",
    email: "maya.kessler@contoso-cloud.com",
    directoryName: "Contoso Cloud directory",
    roleLabel: "Signed in · Reader role",
};

export const AZURE_SUBSCRIPTIONS: AzureSubscriptionOption[] = [
    {
        id: "8f2c1a7e-4b91",
        name: "Contoso Production",
        shortId: "8f2c1a7e-…-4b91",
    },
    {
        id: "3d9a5e10-9c22",
        name: "Contoso Staging",
        shortId: "3d9a5e10-…-9c22",
    },
];

export const INITIAL_AZURE_RESOURCES: AzureResourceRow[] = [
    {
        id: "az-1",
        name: "stgprodassets01",
        resourceGroup: "rg-prod-weu-01",
        location: "West Europe",
        lastModified: "Nov 20, 2026",
        selected: true,
    },
    {
        id: "az-2",
        name: "stgbackups02",
        resourceGroup: "rg-backup-weu",
        location: "West Europe",
        lastModified: "Nov 12, 2026",
        selected: true,
    },
    {
        id: "az-3",
        name: "stglogsweu01",
        resourceGroup: "rg-monitoring-weu",
        location: "West Europe",
        lastModified: "Oct 30, 2026",
        selected: true,
    },
    {
        id: "az-4",
        name: "stgarchive03",
        resourceGroup: "rg-archive-neu",
        location: "North Europe",
        lastModified: "Sep 18, 2026",
        selected: true,
    },
    {
        id: "az-5",
        name: "stgdevscratch07",
        resourceGroup: "rg-dev-weu",
        location: "West Europe",
        lastModified: "Nov 25, 2026",
        selected: false,
    },
    {
        id: "az-6",
        name: "stgcdnstatic04",
        resourceGroup: "rg-web-weu",
        location: "West Europe",
        lastModified: "Aug 2, 2026",
        selected: false,
    },
];

export const MOCK_RUNNING_PROGRESS_ROWS: AuditRunProgressRow[] = [
    {
        resourceName: "stgprodassets01",
        state: "Done",
        note: "7 of 7 checks · 5 findings",
    },
    {
        resourceName: "stglogsweu01",
        state: "Done",
        note: "7 of 7 checks · 3 findings",
    },
    {
        resourceName: "stgbackups02",
        state: "Evaluating",
        note: "4 of 7 checks",
    },
    {
        resourceName: "stgarchive03",
        state: "Queued",
        note: "Waiting",
    },
];

export const INITIAL_AUDIT_FINDINGS: AuditFinding[] = [
    {
        id: "f-01",
        policyId: "04",
        policyTitle: "Anonymous public access to blobs must be disabled",
        severity: "High",
        resourceName: "stgprodassets01",
        resourceType: "Storage Account",
        resourceGroup: "rg-prod-weu-01",
        reason: "Containers in this account are allowed to be made public.",
        explanation:
            "The storage account permits anonymous public access at the account level. Any container configured with public access exposes blobs directly on the internet without authentication.",
        fieldChecked: "properties.allowBlobPublicAccess",
        ruleDescription: "allowBlobPublicAccess must be set to false",
        actualJson: '"properties": {\n  "allowBlobPublicAccess": true\n}',
        expectedJson: '"properties": {\n  "allowBlobPublicAccess": false\n}',
        fixSummary: "Disable anonymous blob public access on the storage account.",
        fixCommand: "az storage account update -n stgprodassets01 -g rg-prod-weu-01 --allow-blob-public-access false",
        regoFilePath: "policies/storage.rego",
        regoFileName: "storage.rego",
        regoLineStart: 17,
        regoLineEnd: 21,
        isAiJudgmentCall: false,
        aiDecision: "pending",
    },
    {
        id: "f-02",
        policyId: "05",
        policyTitle: "Network access must be denied by default",
        severity: "High",
        resourceName: "stgprodassets01",
        resourceType: "Storage Account",
        resourceGroup: "rg-prod-weu-01",
        reason: "Account is reachable from any network.",
        explanation:
            "The storage account firewall default action is set to Allow, permitting traffic from all public IP ranges unless explicitly blocked.",
        fieldChecked: "properties.networkAcls.defaultAction",
        ruleDescription: "defaultAction must equal Deny",
        actualJson: '"networkAcls": {\n  "defaultAction": "Allow"\n}',
        expectedJson: '"networkAcls": {\n  "defaultAction": "Deny"\n}',
        fixSummary: "Change the default network rule action to Deny and allowlist trusted virtual networks.",
        fixCommand: "az storage account update -n stgprodassets01 -g rg-prod-weu-01 --default-action Deny",
        regoFilePath: "policies/storage.rego",
        regoFileName: "storage.rego",
        regoLineStart: 23,
        regoLineEnd: 28,
        isAiJudgmentCall: false,
        aiDecision: "pending",
    },
    {
        id: "f-03",
        policyId: "02",
        policyTitle: "Storage accounts must accept HTTPS traffic only",
        severity: "High",
        resourceName: "stgbackups02",
        resourceType: "Storage Account",
        resourceGroup: "rg-backup-weu",
        reason: "Account accepts plain HTTP traffic.",
        explanation:
            "Secure transfer is disabled on this storage account, allowing unencrypted HTTP requests that expose credentials and data in transit.",
        fieldChecked: "properties.supportsHttpsTrafficOnly",
        ruleDescription: "supportsHttpsTrafficOnly must be true",
        actualJson: '"properties": {\n  "supportsHttpsTrafficOnly": false\n}',
        expectedJson: '"properties": {\n  "supportsHttpsTrafficOnly": true\n}',
        fixSummary: "Require HTTPS-only traffic for all REST API requests.",
        fixCommand: "az storage account update -n stgbackups02 -g rg-backup-weu --https-only true",
        regoFilePath: "policies/storage.rego",
        regoFileName: "storage.rego",
        regoLineStart: 5,
        regoLineEnd: 9,
        isAiJudgmentCall: false,
        aiDecision: "pending",
    },
    {
        id: "f-04",
        policyId: "03",
        policyTitle: "Storage accounts must require TLS 1.2 or higher",
        severity: "High",
        resourceName: "stgbackups02",
        resourceType: "Storage Account",
        resourceGroup: "rg-backup-weu",
        reason: "Minimum TLS version is set to TLS 1.0.",
        explanation:
            "Clients can negotiate deprecated TLS 1.0 or TLS 1.1 connections with known cryptographic weaknesses.",
        fieldChecked: "properties.minimumTlsVersion",
        ruleDescription: "minimumTlsVersion must be TLS1_2 or TLS1_3",
        actualJson: '"properties": {\n  "minimumTlsVersion": "TLS1_0"\n}',
        expectedJson: '"properties": {\n  "minimumTlsVersion": "TLS1_2"\n}',
        fixSummary: "Raise the minimum supported TLS version to TLS1_2.",
        fixCommand: "az storage account update -n stgbackups02 -g rg-backup-weu --min-tls-version TLS1_2",
        regoFilePath: "policies/storage.rego",
        regoFileName: "storage.rego",
        regoLineStart: 11,
        regoLineEnd: 15,
        isAiJudgmentCall: false,
        aiDecision: "pending",
    },
    {
        id: "f-05",
        policyId: "05",
        policyTitle: "Network access must be denied by default",
        severity: "High",
        resourceName: "stgbackups02",
        resourceType: "Storage Account",
        resourceGroup: "rg-backup-weu",
        reason: "Account is reachable from any network.",
        explanation:
            "The storage account firewall default action is set to Allow, exposing backup containers to any external network.",
        fieldChecked: "properties.networkAcls.defaultAction",
        ruleDescription: "defaultAction must equal Deny",
        actualJson: '"networkAcls": {\n  "defaultAction": "Allow"\n}',
        expectedJson: '"networkAcls": {\n  "defaultAction": "Deny"\n}',
        fixSummary: "Set the network ACL default action to Deny.",
        fixCommand: "az storage account update -n stgbackups02 -g rg-backup-weu --default-action Deny",
        regoFilePath: "policies/storage.rego",
        regoFileName: "storage.rego",
        regoLineStart: 23,
        regoLineEnd: 28,
        isAiJudgmentCall: false,
        aiDecision: "pending",
    },
    {
        id: "f-06",
        policyId: "04",
        policyTitle: "Anonymous public access to blobs must be disabled",
        severity: "High",
        resourceName: "stglogsweu01",
        resourceType: "Storage Account",
        resourceGroup: "rg-monitoring-weu",
        reason: "Containers in this account are allowed to be made public.",
        explanation:
            "Diagnostic log containers could be exposed publicly because anonymous blob access is permitted at the account level.",
        fieldChecked: "properties.allowBlobPublicAccess",
        ruleDescription: "allowBlobPublicAccess must be set to false",
        actualJson: '"properties": {\n  "allowBlobPublicAccess": true\n}',
        expectedJson: '"properties": {\n  "allowBlobPublicAccess": false\n}',
        fixSummary: "Disable anonymous blob public access on the storage account.",
        fixCommand: "az storage account update -n stglogsweu01 -g rg-monitoring-weu --allow-blob-public-access false",
        regoFilePath: "policies/storage.rego",
        regoFileName: "storage.rego",
        regoLineStart: 17,
        regoLineEnd: 21,
        isAiJudgmentCall: false,
        aiDecision: "pending",
    },
    {
        id: "f-07",
        policyId: "01",
        policyTitle: "Every resource must have Owner and Environment tags",
        severity: "Medium",
        resourceName: "stgprodassets01",
        resourceType: "Storage Account",
        resourceGroup: "rg-prod-weu-01",
        reason: "An 'env' tag exists with value 'Prod', but no tag named Environment.",
        explanation:
            "An `env` tag exists with value `Prod`. This is likely the Environment tag with a different name, but it doesn't match the required tag name. Tools that route costs and alerts by the `Environment` tag won't see this account.",
        fieldChecked: "tags.Environment",
        ruleDescription: "Tag keys must match exactly (case-sensitive)",
        actualJson: '"tags": {\n  "Owner": "platform-team",\n  "env": "Prod"\n}',
        expectedJson: '"tags": {\n  "Owner": "<any>",\n  "Environment": "<any>"\n}',
        fixSummary: "Rename the env tag to Environment and keep the value.",
        fixCommand: "az storage account update -n stgprodassets01 -g rg-prod-weu-01 --tags Owner=platform-team Environment=Prod",
        regoFilePath: "policies/tagging.rego",
        regoFileName: "tagging.rego",
        regoLineStart: 5,
        regoLineEnd: 14,
        isAiJudgmentCall: true,
        aiConfidencePercent: 72,
        aiNote: "OPA failed this check on an exact tag-name match. The agent thinks the intent is probably met, but a reviewer should decide.",
        aiDecision: "pending",
    },
    {
        id: "f-08",
        policyId: "06",
        policyTitle: "Access keys must be rotated at least every 90 days",
        severity: "Medium",
        resourceName: "stgprodassets01",
        resourceType: "Storage Account",
        resourceGroup: "rg-prod-weu-01",
        reason: "Keys not rotated in over 90 days: key1, key2.",
        explanation:
            "Both primary and secondary storage account access keys are older than 90 days, increasing the blast radius if a shared key leaks.",
        fieldChecked: "properties.keys",
        ruleDescription: "All active access keys must be rotated within 90 days",
        actualJson: '"keys": [\n  { "keyName": "key1", "ageDays": 142 },\n  { "keyName": "key2", "ageDays": 142 }\n]',
        expectedJson: '"keys": [\n  { "keyName": "key1", "ageDays": "<= 90" },\n  { "keyName": "key2", "ageDays": "<= 90" }\n]',
        fixSummary: "Regenerate key1 and key2 after updating connected services or migrating to Entra ID.",
        fixCommand: "az storage account keys renew -n stgprodassets01 -g rg-prod-weu-01 --key primary",
        regoFilePath: "policies/storage.rego",
        regoFileName: "storage.rego",
        regoLineStart: 30,
        regoLineEnd: 35,
        isAiJudgmentCall: false,
        aiDecision: "pending",
    },
    {
        id: "f-09",
        policyId: "06",
        policyTitle: "Access keys must be rotated at least every 90 days",
        severity: "Medium",
        resourceName: "stglogsweu01",
        resourceType: "Storage Account",
        resourceGroup: "rg-monitoring-weu",
        reason: "Keys not rotated in over 90 days: key2.",
        explanation:
            "Secondary key key2 has exceeded the 90-day rotation threshold.",
        fieldChecked: "properties.keys",
        ruleDescription: "All active access keys must be rotated within 90 days",
        actualJson: '"keys": [\n  { "keyName": "key2", "ageDays": 118 }\n]',
        expectedJson: '"keys": [\n  { "keyName": "key2", "ageDays": "<= 90" }\n]',
        fixSummary: "Regenerate secondary access key key2.",
        fixCommand: "az storage account keys renew -n stglogsweu01 -g rg-monitoring-weu --key secondary",
        regoFilePath: "policies/storage.rego",
        regoFileName: "storage.rego",
        regoLineStart: 30,
        regoLineEnd: 35,
        isAiJudgmentCall: false,
        aiDecision: "pending",
    },
    {
        id: "f-10",
        policyId: "01",
        policyTitle: "Every resource must have Owner and Environment tags",
        severity: "Medium",
        resourceName: "stglogsweu01",
        resourceType: "Storage Account",
        resourceGroup: "rg-monitoring-weu",
        reason: "Owner tag is missing.",
        explanation:
            "This storage account has an Environment tag but lacks an Owner tag for incident escalation and chargeback.",
        fieldChecked: "tags.Owner",
        ruleDescription: "Tag keys must match exactly (case-sensitive)",
        actualJson: '"tags": {\n  "Environment": "Prod"\n}',
        expectedJson: '"tags": {\n  "Owner": "<any>",\n  "Environment": "<any>"\n}',
        fixSummary: "Add an Owner tag identifying the responsible team.",
        fixCommand: "az storage account update -n stglogsweu01 -g rg-monitoring-weu --tags Owner=observability Environment=Prod",
        regoFilePath: "policies/tagging.rego",
        regoFileName: "tagging.rego",
        regoLineStart: 5,
        regoLineEnd: 14,
        isAiJudgmentCall: false,
        aiDecision: "pending",
    },
    {
        id: "f-11",
        policyId: "07",
        policyTitle: "The portal should default to Entra ID authentication",
        severity: "Low",
        resourceName: "stgprodassets01",
        resourceType: "Storage Account",
        resourceGroup: "rg-prod-weu-01",
        reason: "Portal uses access keys instead of Entra ID by default.",
        explanation:
            "Operators browsing data in the Azure portal default to shared access key authorization instead of Microsoft Entra ID RBAC.",
        fieldChecked: "properties.defaultToOAuthAuthentication",
        ruleDescription: "defaultToOAuthAuthentication should be true",
        actualJson: '"properties": {\n  "defaultToOAuthAuthentication": false\n}',
        expectedJson: '"properties": {\n  "defaultToOAuthAuthentication": true\n}',
        fixSummary: "Enable Entra ID default authentication in the Azure portal.",
        fixCommand: "az storage account update -n stgprodassets01 -g rg-prod-weu-01 --default-to-oauth true",
        regoFilePath: "policies/storage.rego",
        regoFileName: "storage.rego",
        regoLineStart: 37,
        regoLineEnd: 41,
        isAiJudgmentCall: false,
        aiDecision: "pending",
    },
    {
        id: "f-12",
        policyId: "07",
        policyTitle: "The portal should default to Entra ID authentication",
        severity: "Low",
        resourceName: "stgbackups02",
        resourceType: "Storage Account",
        resourceGroup: "rg-backup-weu",
        reason: "Portal uses access keys instead of Entra ID by default.",
        explanation:
            "Operators browsing data in the Azure portal default to shared access key authorization instead of Microsoft Entra ID RBAC.",
        fieldChecked: "properties.defaultToOAuthAuthentication",
        ruleDescription: "defaultToOAuthAuthentication should be true",
        actualJson: '"properties": {\n  "defaultToOAuthAuthentication": false\n}',
        expectedJson: '"properties": {\n  "defaultToOAuthAuthentication": true\n}',
        fixSummary: "Enable Entra ID default authentication in the Azure portal.",
        fixCommand: "az storage account update -n stgbackups02 -g rg-backup-weu --default-to-oauth true",
        regoFilePath: "policies/storage.rego",
        regoFileName: "storage.rego",
        regoLineStart: 37,
        regoLineEnd: 41,
        isAiJudgmentCall: false,
        aiDecision: "pending",
    },
];

export const PDF_RESOURCE_SUMMARIES: PdfResourceSummaryRow[] = [
    { name: "stgprodassets01", high: 2, medium: 2, low: 1, isCompliant: false },
    { name: "stgbackups02", high: 3, medium: 0, low: 1, isCompliant: false },
    { name: "stglogsweu01", high: 1, medium: 2, low: 0, isCompliant: false },
    { name: "stgarchive03", high: 0, medium: 0, low: 0, isCompliant: true },
];

const STORAGE_REGO_CODE = `package policylens.azure.storage

import rego.v1

# 02 · High · Storage accounts must accept HTTPS traffic only
deny contains finding if {
    input.properties.supportsHttpsTrafficOnly == false
    finding := make_finding("02", "High", "properties.supportsHttpsTrafficOnly")
}

# 03 · High · Storage accounts must require TLS 1.2 or higher
deny contains finding if {
    not input.properties.minimumTlsVersion in {"TLS1_2", "TLS1_3"}
    finding := make_finding("03", "High", "properties.minimumTlsVersion")
}

# 04 · High · Anonymous public access to blobs must be disabled
deny contains finding if {
    input.properties.allowBlobPublicAccess == true
    finding := make_finding("04", "High", "properties.allowBlobPublicAccess")
}

# 05 · High · Network access must be denied by default
deny contains finding if {
    action := input.properties.networkAcls.defaultAction
    action != "Deny"
    finding := make_finding("05", "High", "properties.networkAcls.defaultAction")
}

# 06 · Medium · Access keys must be rotated at least every 90 days
deny contains finding if {
    some key in input.properties.keys
    age_days(key.creationTime) > 90
    finding := make_finding("06", "Medium", "properties.keys")
}

# 07 · Low · The portal should default to Entra ID authentication
deny contains finding if {
    not input.properties.defaultToOAuthAuthentication
    finding := make_finding("07", "Low", "properties.defaultToOAuthAuthentication")
}

make_finding(id, sev, field) := {"id": id, "severity": sev, "field": field}

age_days(t) := (time.now_ns() - time.parse_rfc3339_ns(t)) / 86400000000000`;

const TAGGING_REGO_CODE = `package policylens.azure.tagging

import rego.v1

# 01 · Medium · Every resource must have Owner and Environment tags
deny contains finding if {
    not has_required_tags(input.tags)
    finding := make_finding("01", "Medium", "tags.Environment")
}

has_required_tags(tags) if {
    tags.Owner != ""
    tags.Environment != ""
}

make_finding(id, sev, field) := {"id": id, "severity": sev, "field": field}`;

const FUNCTIONS_REGO_CODE = `package policylens.azure.functions

import rego.v1

# 08 · High · Function apps must enforce HTTPS-only requests
deny contains finding if {
    input.properties.httpsOnly == false
    finding := make_finding("08", "High", "properties.httpsOnly")
}

# 09 · Medium · Function apps must use a managed identity
deny contains finding if {
    not input.identity.type
    finding := make_finding("09", "Medium", "identity.type")
}

# 10 · Low · Remote debugging must be disabled in production
deny contains finding if {
    input.properties.siteConfig.remoteDebuggingEnabled == true
    finding := make_finding("10", "Low", "properties.siteConfig.remoteDebuggingEnabled")
}

make_finding(id, sev, field) := {"id": id, "severity": sev, "field": field}`;

export const INITIAL_POLICY_FILES: PolicyFileRecord[] = [
    {
        id: "storage.rego",
        fileName: "storage.rego",
        packageName: "policylens.azure.storage",
        filePath: "policies/storage.rego",
        appliesTo: ["Storage Account"],
        appliesToSummary: "Storage Account",
        updatedDate: "Nov 18, 2026",
        updatedBy: "Daniel Osei",
        code: STORAGE_REGO_CODE,
        rules: [
            { id: "02", severity: "High", title: "Storage accounts must accept HTTPS traffic only", line: 5 },
            { id: "03", severity: "High", title: "Storage accounts must require TLS 1.2 or higher", line: 11 },
            { id: "04", severity: "High", title: "Anonymous public access to blobs must be disabled", line: 17 },
            { id: "05", severity: "High", title: "Network access must be denied by default", line: 23 },
            { id: "06", severity: "Medium", title: "Access keys must be rotated at least every 90 days", line: 30 },
            { id: "07", severity: "Low", title: "The portal should default to Entra ID authentication", line: 37 },
        ],
    },
    {
        id: "tagging.rego",
        fileName: "tagging.rego",
        packageName: "policylens.azure.tagging",
        filePath: "policies/tagging.rego",
        appliesTo: ["Storage Account", "Function App", "Logic App"],
        appliesToSummary: "Storage Account, Function App, Logic App",
        updatedDate: "Nov 2, 2026",
        updatedBy: "Maya Kessler",
        code: TAGGING_REGO_CODE,
        rules: [{ id: "01", severity: "Medium", title: "Every resource must have Owner and Environment tags", line: 5 }],
    },
    {
        id: "functions.rego",
        fileName: "functions.rego",
        packageName: "policylens.azure.functions",
        filePath: "policies/functions.rego",
        appliesTo: ["Function App"],
        appliesToSummary: "Function App",
        updatedDate: "Oct 29, 2026",
        updatedBy: "Daniel Osei",
        code: FUNCTIONS_REGO_CODE,
        rules: [
            { id: "08", severity: "High", title: "Function apps must enforce HTTPS-only requests", line: 5 },
            { id: "09", severity: "Medium", title: "Function apps must use a managed identity", line: 11 },
            { id: "10", severity: "Low", title: "Remote debugging must be disabled in production", line: 17 },
        ],
    },
];

export const POLICY_COVERAGE_CARDS: PolicyCoverageCard[] = [
    {
        resourceType: "Storage Account",
        ruleCount: 7,
        subtitle: "rules · 4 high, 2 medium, 1 low",
        hasPolicies: true,
    },
    {
        resourceType: "Function App",
        ruleCount: 4,
        subtitle: "rules from 2 files",
        hasPolicies: true,
    },
    {
        resourceType: "Logic App",
        ruleCount: 1,
        subtitle: "rule from tagging.rego",
        hasPolicies: true,
    },
    {
        resourceType: "App Service",
        ruleCount: 0,
        subtitle: "No policies yet",
        hasPolicies: false,
    },
];
