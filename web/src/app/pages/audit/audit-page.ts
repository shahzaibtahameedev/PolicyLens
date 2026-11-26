import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import {
    AUDIT_RUN_STEP_DELAY_MS,
    AUDIT_STEP_RESOURCES,
    AUDIT_STEP_REVIEW,
    AUDIT_STEP_TYPE,
    COPY_SUCCESS_MESSAGE,
    MAX_UPLOAD_SIZE_BYTES,
    PDF_DOWNLOAD_MESSAGE,
    SEVERITY_ORDER,
} from "../../core/constants";
import {
    AZURE_ACCOUNT,
    AZURE_SUBSCRIPTIONS,
    INITIAL_AUDIT_FINDINGS,
    INITIAL_AZURE_RESOURCES,
    INITIAL_UPLOADED_FILES,
    MOCK_RUNNING_PROGRESS_ROWS,
    PDF_RESOURCE_SUMMARIES,
    RESOURCE_TYPE_OPTIONS,
} from "../../core/mock-data";
import type {
    AiDecision,
    AuditFinding,
    AuditRunProgressRow,
    AzureResourceRow,
    ResourceTypeOption,
    SeverityLevel,
    UploadedResourceFile,
} from "../../core/models";
import { NotificationService } from "../../core/notification.service";
import { SeverityBadge } from "../../shared/severity-badge/severity-badge";
import { FindingDrawer } from "./finding-drawer";
import { PdfPreviewModal } from "./pdf-preview-modal";

type ResourceInputTab = "upload" | "azure";
type ReviewViewState = "running" | "results";
type SeverityFilter = "All" | SeverityLevel;

const DEFAULT_AUDIT_TIMESTAMP = "Nov 26, 2026 09:42";
const BYTES_PER_KB = 1024;

@Component({
    selector: "pl-audit-page",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, SeverityBadge, FindingDrawer, PdfPreviewModal],
    template: `
        <div class="flex h-full flex-col overflow-hidden bg-canvas text-ink">
            <div class="flex h-9 shrink-0 items-center gap-1.5 px-7 text-[13px] text-muted">
                <a routerLink="/dashboard" class="text-link no-underline hover:text-link-hover">PolicyLens</a>
                <span>›</span>
                <button
                    type="button"
                    (click)="resetWizard()"
                    class="cursor-pointer text-link hover:text-link-hover"
                >
                    Audit
                </button>
                <span>›</span>
                @if (currentStep() === stepReview) {
                    <span>{{ selectedType().name }} · {{ auditTimestamp }}</span>
                } @else {
                    <span>New audit</span>
                }
            </div>

            <div class="flex shrink-0 flex-wrap items-center justify-between gap-3 px-7 pb-3.5">
                <div>
                    <h1 class="text-2xl font-semibold leading-8 text-ink">{{ headerTitle() }}</h1>
                    <p class="mt-0.5 text-[13px] leading-[18px] text-muted">{{ headerSubtitle() }}</p>
                </div>

                @if (currentStep() === stepReview) {
                    @if (reviewState() === "running") {
                        <div class="flex gap-2.5">
                            <button
                                type="button"
                                (click)="cancelRunningAudit()"
                                class="h-9 cursor-pointer rounded-xs border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-hover"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled
                                class="h-9 rounded-xs bg-surface-disabled px-4 text-sm font-semibold text-disabled-text"
                            >
                                Running…
                            </button>
                        </div>
                    } @else {
                        <div class="flex gap-2.5">
                            <button
                                type="button"
                                (click)="startAuditRun()"
                                class="flex h-9 cursor-pointer items-center gap-2 rounded-xs border border-border bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-surface-hover"
                            >
                                <span class="text-primary">↻</span>
                                <span>Run again</span>
                            </button>
                            <button
                                type="button"
                                (click)="resetWizard()"
                                class="flex h-9 cursor-pointer items-center gap-2 rounded-xs border border-border bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-surface-hover"
                            >
                                <span class="text-primary">+</span>
                                <span>New audit</span>
                            </button>
                            <button
                                type="button"
                                (click)="openPdfModal()"
                                class="flex h-9 cursor-pointer items-center gap-2 rounded-xs bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover"
                            >
                                <span>↓</span>
                                <span>Export PDF</span>
                            </button>
                        </div>
                    }
                }
            </div>

            <div class="flex shrink-0 flex-wrap items-center gap-3.5 border-y border-hairline bg-surface px-7 py-3.5">
                <button
                    type="button"
                    (click)="jumpToStep(stepType)"
                    [disabled]="currentStep() <= stepType"
                    class="flex items-center gap-2.5 text-sm disabled:cursor-default"
                    [class.cursor-pointer]="currentStep() > stepType"
                >
                    @if (currentStep() > stepType) {
                        <span
                            class="size-7 rounded-full bg-primary text-center text-[13px] leading-7 text-on-primary"
                        >
                            ✓
                        </span>
                        <span class="text-ink">Choose resource type</span>
                        <span class="text-[13px] text-muted">{{ selectedType().name }}</span>
                    } @else {
                        <span
                            class="size-6 rounded-full border-2 border-primary text-center text-[13px] font-semibold leading-5 text-primary"
                        >
                            1
                        </span>
                        <span class="font-semibold text-ink">Choose resource type</span>
                    }
                </button>

                <span class="h-px w-16" [class]="currentStep() > stepType ? 'bg-primary' : 'bg-border'"></span>

                <button
                    type="button"
                    (click)="jumpToStep(stepResources)"
                    [disabled]="currentStep() <= stepResources"
                    class="flex items-center gap-2.5 text-sm disabled:cursor-default"
                    [class.cursor-pointer]="currentStep() > stepResources"
                >
                    @if (currentStep() > stepResources) {
                        <span
                            class="size-7 rounded-full bg-primary text-center text-[13px] leading-7 text-on-primary"
                        >
                            ✓
                        </span>
                        <span class="text-ink">Provide resources</span>
                        <span class="text-[13px] text-muted">{{ stepTwoSummaryBadge() }}</span>
                    } @else if (currentStep() === stepResources) {
                        <span
                            class="size-6 rounded-full border-2 border-primary text-center text-[13px] font-semibold leading-5 text-primary"
                        >
                            2
                        </span>
                        <span class="font-semibold text-ink">Provide resources</span>
                    } @else {
                        <span
                            class="size-[26px] rounded-full border border-border text-center text-[13px] leading-6 text-muted"
                        >
                            2
                        </span>
                        <span class="text-muted">Provide resources</span>
                    }
                </button>

                <span class="h-px w-16" [class]="currentStep() > stepResources ? 'bg-primary' : 'bg-border'"></span>

                <div class="flex items-center gap-2.5 text-sm">
                    @if (currentStep() === stepReview) {
                        <span
                            class="size-6 rounded-full border-2 border-primary text-center text-[13px] font-semibold leading-5 text-primary"
                        >
                            3
                        </span>
                        <span class="font-semibold text-ink">Run and review</span>
                    } @else {
                        <span
                            class="size-[26px] rounded-full border border-border text-center text-[13px] leading-6 text-muted"
                        >
                            3
                        </span>
                        <span class="text-muted">Run and review</span>
                    }
                </div>
            </div>

            @if (currentStep() === stepType) {
                <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-7 py-6">
                    <div>
                        <h2 class="text-lg font-semibold leading-6 text-ink">Choose a resource type</h2>
                        <p class="mt-0.5 text-[13px] leading-[18px] text-muted">
                            Each audit checks one resource type. Only types with policies in OPA can be audited.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        @for (option of resourceTypeOptions; track option.id) {
                            @if (option.isEnabled) {
                                <button
                                    type="button"
                                    (click)="selectResourceType(option)"
                                    [class]="resourceCardClasses(option)"
                                >
                                    <span [class]="resourceRadioClasses(option)"></span>
                                    <span [class]="resourceAvatarClasses(option)">{{ option.shortCode }}</span>
                                    <div>
                                        <div class="text-[17px] font-semibold leading-6 text-ink">
                                            {{ option.name }}
                                        </div>
                                        <div class="mt-0.5 font-mono text-[13px] leading-[18px] text-muted">
                                            {{ option.azureType }}
                                        </div>
                                    </div>
                                    <div
                                        class="border-t pt-3"
                                        [class]="
                                            selectedTypeId() === option.id
                                                ? 'border-primary-tint-strong'
                                                : 'border-hairline'
                                        "
                                    >
                                        <div class="text-sm font-semibold text-ink">
                                            {{ option.policyCount }}
                                            {{ option.policyCount === 1 ? "policy" : "policies" }} loaded
                                        </div>
                                        <div class="mt-0.5 text-[13px] leading-[18px] text-muted">
                                            {{ option.policyFilesLabel }}
                                        </div>
                                    </div>
                                </button>
                            } @else {
                                <div
                                    class="relative flex cursor-not-allowed flex-col gap-3 rounded border border-dashed border-border bg-surface-soft p-5"
                                >
                                    <span
                                        class="absolute top-4 right-4 size-[18px] rounded-full border border-border bg-surface-disabled"
                                    ></span>
                                    <span
                                        class="flex size-9 items-center justify-center rounded bg-hairline text-[13px] font-semibold text-subtle"
                                    >
                                        {{ option.shortCode }}
                                    </span>
                                    <div>
                                        <div class="text-[17px] font-semibold leading-6 text-subtle">
                                            {{ option.name }}
                                        </div>
                                        <div class="mt-0.5 font-mono text-[13px] leading-[18px] text-subtle">
                                            {{ option.azureType }}
                                        </div>
                                    </div>
                                    <div class="border-t border-hairline pt-3">
                                        <div class="text-sm font-semibold text-muted">{{ option.policyFilesLabel }}</div>
                                        <a
                                            routerLink="/policies"
                                            class="mt-0.5 inline-block text-[13px] leading-[18px] text-link no-underline hover:text-link-hover"
                                        >
                                            Add a policy file
                                        </a>
                                    </div>
                                </div>
                            }
                        }
                    </div>

                    <div class="mt-2 overflow-hidden rounded border border-hairline bg-surface">
                        <div class="flex items-center justify-between px-5 pt-3.5 pb-2.5">
                            <span class="text-sm font-semibold text-ink">
                                Policies that will run on {{ selectedType().name }}
                            </span>
                            <span class="text-[13px] text-muted">
                                {{ selectedType().policies.length }}
                                {{ selectedType().policies.length === 1 ? "rule" : "rules" }}
                            </span>
                        </div>

                        <div
                            class="grid h-11 grid-cols-[70px_minmax(0,1fr)_130px_180px] items-center gap-3 border-b border-border px-5 text-sm font-semibold text-ink"
                        >
                            <span>ID</span>
                            <span>Policy</span>
                            <span>Severity</span>
                            <span>File</span>
                        </div>

                        @for (policy of selectedType().policies; track policy.id) {
                            <div
                                class="grid h-11 grid-cols-[70px_minmax(0,1fr)_130px_180px] items-center gap-3 border-b border-hairline px-5 text-sm last:border-b-0"
                            >
                                <span class="font-mono text-[13px] text-body">{{ policy.id }}</span>
                                <span class="truncate text-ink">{{ policy.title }}</span>
                                <span>
                                    <pl-severity-badge [severity]="policy.severity" />
                                </span>
                                <span class="font-mono text-[13px] text-body">{{ policy.fileName }}</span>
                            </div>
                        }
                    </div>
                </div>

                <div class="flex h-16 shrink-0 items-center gap-2.5 border-t border-hairline bg-surface px-7 py-3">
                    <button
                        type="button"
                        disabled
                        class="h-9 rounded-xs bg-surface-disabled px-4 text-sm font-semibold text-disabled-text"
                    >
                        ‹ Previous
                    </button>
                    <button
                        type="button"
                        (click)="goToResourcesStep()"
                        class="h-9 cursor-pointer rounded-xs bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
                    >
                        Next: Provide resources ›
                    </button>
                    <span class="ml-auto text-[13px] text-muted">
                        {{ selectedType().name }} selected · {{ selectedType().policyCount }}
                        {{ selectedType().policyCount === 1 ? "policy" : "policies" }}
                    </span>
                </div>
            } @else if (currentStep() === stepResources) {
                <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-7 py-6">
                    <div>
                        <h2 class="text-lg font-semibold leading-6 text-ink">Provide resources</h2>
                        <p class="mt-0.5 text-[13px] leading-[18px] text-muted">
                            Upload exported resource JSON, or read resources directly from your Azure subscription.
                        </p>
                    </div>

                    <div class="flex gap-7 border-b border-hairline text-sm">
                        <button
                            type="button"
                            (click)="setResourceTab('upload')"
                            [class]="resourceTabClasses('upload')"
                        >
                            Upload JSON
                        </button>
                        <button
                            type="button"
                            (click)="setResourceTab('azure')"
                            [class]="resourceTabClasses('azure')"
                        >
                            Sign in with Microsoft
                        </button>
                    </div>

                    @if (resourceTab() === "upload") {
                        <div
                            (dragover)="onDragOver($event)"
                            (dragleave)="onDragLeave()"
                            (drop)="onFileDrop($event)"
                            [class]="dropZoneClasses()"
                        >
                            <span class="text-2xl leading-6 text-primary">↑</span>
                            <span class="text-[15px] text-ink">
                                Drag and drop .json files here, or
                                <label class="cursor-pointer font-semibold text-link hover:text-link-hover">
                                    browse
                                    <input
                                        type="file"
                                        accept=".json,application/json"
                                        multiple
                                        class="sr-only"
                                        (change)="onFileInputChange($event)"
                                    />
                                </label>
                            </span>
                            <span class="text-[13px] leading-[18px] text-muted">
                                One resource per file, or an array of resources · Up to 5 MB per file
                            </span>
                        </div>

                        <div class="overflow-hidden rounded border border-hairline bg-surface">
                            <div class="flex items-center justify-between px-5 pt-3.5 pb-2.5">
                                <span class="text-sm font-semibold text-ink">Uploaded files</span>
                                <span class="text-[13px] text-muted">{{ uploadSummaryText() }}</span>
                            </div>

                            <div
                                class="grid h-11 grid-cols-[250px_210px_220px_90px_minmax(0,1fr)_36px] items-center gap-3 border-b border-border px-5 text-sm font-semibold text-ink"
                            >
                                <span>File</span>
                                <span>Resource name</span>
                                <span>Detected type</span>
                                <span>Size</span>
                                <span>Status</span>
                                <span></span>
                            </div>

                            @for (file of uploadedFiles(); track file.id) {
                                @if (file.isMatchingType) {
                                    <div
                                        class="grid h-11 grid-cols-[250px_210px_220px_90px_minmax(0,1fr)_36px] items-center gap-3 border-b border-hairline px-5 text-sm last:border-b-0"
                                    >
                                        <span class="truncate font-mono text-[13px] text-ink">{{ file.fileName }}</span>
                                        <span class="truncate text-ink">{{ file.resourceName }}</span>
                                        <span class="text-ink">{{ file.detectedType }}</span>
                                        <span class="text-muted">{{ file.sizeLabel }}</span>
                                        <span class="flex items-center gap-2 text-[13px] text-ink">
                                            <span class="size-2 rounded-full bg-success"></span>
                                            <span>Ready</span>
                                        </span>
                                        <button
                                            type="button"
                                            (click)="removeUploadedFile(file.id)"
                                            aria-label="Remove file"
                                            class="cursor-pointer text-center text-muted hover:text-ink"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                } @else {
                                    <div class="border-b border-error-border bg-error-tint px-5 py-3 last:border-b-0">
                                        <div
                                            class="grid min-h-6 grid-cols-[250px_210px_220px_90px_minmax(0,1fr)_36px] items-center gap-3 text-sm"
                                        >
                                            <span class="truncate font-mono text-[13px] text-ink">
                                                {{ file.fileName }}
                                            </span>
                                            <span class="truncate text-ink">{{ file.resourceName }}</span>
                                            <span class="font-semibold text-error-text">{{ file.detectedType }}</span>
                                            <span class="text-muted">{{ file.sizeLabel }}</span>
                                            <span
                                                class="flex items-center gap-2 text-[13px] font-semibold text-error-text"
                                            >
                                                <span class="text-[11px]">✕</span>
                                                <span>Type doesn't match</span>
                                            </span>
                                            <button
                                                type="button"
                                                (click)="removeUploadedFile(file.id)"
                                                aria-label="Remove file"
                                                class="cursor-pointer text-center text-muted hover:text-ink"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        @if (file.mismatchReason) {
                                            <div class="mt-1.5 text-[13px] leading-[18px] text-error-text">
                                                {{ file.mismatchReason }}
                                            </div>
                                        }
                                    </div>
                                }
                            } @empty {
                                <div class="px-5 py-7 text-center text-sm text-muted">
                                    No files uploaded yet. Drag and drop .json files above to add resources.
                                </div>
                            }
                        </div>
                    } @else {
                        <div class="flex gap-3">
                            <div
                                class="flex flex-1 items-center gap-3.5 rounded border border-hairline bg-surface px-5 py-3.5"
                            >
                                <span
                                    class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-tint-strong text-sm font-semibold text-primary"
                                >
                                    {{ azureAccount.initials }}
                                </span>
                                <div>
                                    <div class="text-sm font-semibold text-ink">{{ azureAccount.displayName }}</div>
                                    <div class="text-[13px] leading-[18px] text-muted">
                                        {{ azureAccount.email }} · {{ azureAccount.directoryName }}
                                    </div>
                                </div>
                                <span class="ml-4 flex items-center gap-2 text-[13px] text-ink">
                                    <span class="size-2 rounded-full bg-success"></span>
                                    <span>{{ azureAccount.roleLabel }}</span>
                                </span>
                                <button
                                    type="button"
                                    (click)="notifySwitchAccount()"
                                    class="ml-auto cursor-pointer text-sm text-link hover:text-link-hover"
                                >
                                    Switch account
                                </button>
                            </div>
                        </div>

                        <div class="flex items-start gap-3 rounded bg-info-tint px-4 py-2.5 text-sm">
                            <span
                                class="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary"
                            >
                                i
                            </span>
                            <span class="text-ink">
                                PolicyLens only reads your resources and never changes them. We recommend signing in
                                with an account that has the Reader role.
                            </span>
                        </div>

                        <div class="grid grid-cols-[170px_460px] items-center gap-3 text-sm">
                            <span>
                                Subscription
                                <span class="text-error">*</span>
                            </span>
                            <div class="relative">
                                <select
                                    aria-label="Azure subscription"
                                    [value]="selectedSubscriptionId()"
                                    (change)="onSubscriptionChange($event)"
                                    class="h-9 w-full cursor-pointer appearance-none rounded-xs border border-border border-b-border-accessible bg-surface py-0 pr-8 pl-3 text-sm text-ink focus:border-b-2 focus:border-b-primary"
                                >
                                    @for (sub of azureSubscriptions; track sub.id) {
                                        <option [value]="sub.id">{{ sub.name }} ({{ sub.shortId }})</option>
                                    }
                                </select>
                                <span
                                    class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted"
                                >
                                    ▾
                                </span>
                            </div>
                        </div>

                        <div class="overflow-hidden rounded border border-hairline bg-surface">
                            <div class="flex items-center gap-3 px-5 pt-3.5 pb-2.5">
                                <span class="text-sm font-semibold text-ink">
                                    {{ selectedType().name }}s in {{ selectedSubscription().name }}
                                </span>
                                <div
                                    class="ml-auto flex h-8 w-64 items-center gap-2 rounded-xs border border-border border-b-border-accessible bg-surface px-3 text-[13px] focus-within:border-b-2 focus-within:border-b-primary"
                                >
                                    <span class="text-muted">⌕</span>
                                    <input
                                        type="text"
                                        [value]="azureFilterQuery()"
                                        (input)="onAzureFilterInput($event)"
                                        placeholder="Filter by name or resource group"
                                        class="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
                                    />
                                </div>
                            </div>

                            <div
                                class="grid h-11 grid-cols-[28px_250px_230px_170px_minmax(0,1fr)] items-center gap-3 border-b border-border px-5 text-sm font-semibold text-ink"
                            >
                                <button
                                    type="button"
                                    (click)="toggleAllAzureResources()"
                                    aria-label="Toggle all resources"
                                    class="flex size-[18px] cursor-pointer items-center justify-center rounded-xs text-xs"
                                    [class]="
                                        selectedAzureCount() > 0
                                            ? 'bg-primary text-on-primary'
                                            : 'border border-border-accessible bg-surface text-transparent'
                                    "
                                >
                                    {{ allAzureSelected() ? "✓" : selectedAzureCount() > 0 ? "–" : "" }}
                                </button>
                                <span>Name</span>
                                <span>Resource group</span>
                                <span>Location</span>
                                <span>Last modified</span>
                            </div>

                            @for (resource of filteredAzureResources(); track resource.id) {
                                <div
                                    (click)="toggleAzureResource(resource.id)"
                                    class="grid h-11 cursor-pointer grid-cols-[28px_250px_230px_170px_minmax(0,1fr)] items-center gap-3 border-b border-hairline px-5 text-sm transition last:border-b-0"
                                    [class]="
                                        resource.selected ? 'bg-primary-tint' : 'bg-surface hover:bg-surface-hover'
                                    "
                                >
                                    <span
                                        class="flex size-[18px] items-center justify-center rounded-xs text-xs"
                                        [class]="
                                            resource.selected
                                                ? 'bg-primary text-on-primary'
                                                : 'border border-border-accessible bg-surface text-transparent'
                                        "
                                    >
                                        ✓
                                    </span>
                                    <span class="font-semibold text-ink">{{ resource.name }}</span>
                                    <span>{{ resource.resourceGroup }}</span>
                                    <span>{{ resource.location }}</span>
                                    <span class="text-muted">{{ resource.lastModified }}</span>
                                </div>
                            }

                            <div class="px-5 py-2.5 text-[13px] text-muted">
                                Showing {{ filteredAzureResources().length }} storage accounts ·
                                {{ selectedAzureCount() }} selected
                            </div>
                        </div>
                    }
                </div>

                <div class="flex h-16 shrink-0 items-center gap-2.5 border-t border-hairline bg-surface px-7 py-3">
                    <button
                        type="button"
                        (click)="goToTypeStep()"
                        class="h-9 cursor-pointer rounded-xs border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-hover"
                    >
                        ‹ Previous
                    </button>
                    <button
                        type="button"
                        (click)="startAuditRun()"
                        [disabled]="!canStartAudit()"
                        class="h-9 cursor-pointer rounded-xs bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:cursor-default disabled:bg-surface-disabled disabled:text-disabled-text"
                    >
                        Next: Run audit ›
                    </button>
                    <span class="ml-auto text-[13px] text-muted">{{ stepTwoFooterNote() }}</span>
                </div>
            } @else {
                @if (reviewState() === "running") {
                    <div class="flex flex-1 flex-col gap-4 overflow-y-auto px-7 py-5">
                        <div
                            class="flex max-w-[820px] flex-col gap-4 rounded border border-hairline bg-surface px-7 py-6 shadow-tile"
                        >
                            <div class="flex items-baseline justify-between">
                                <div>
                                    <div class="text-lg font-semibold leading-6 text-ink">Running audit</div>
                                    <div class="mt-0.5 text-[13px] leading-[18px] text-muted">
                                        {{ readyResourceCount() }} resources × {{ selectedType().policyCount }} policies
                                        = {{ totalCheckCount() }} checks · Open Policy Agent at localhost:8181
                                    </div>
                                </div>
                                <span class="font-metric text-[34px] font-semibold leading-10 text-ink">
                                    {{ runProgressPercent() }}%
                                </span>
                            </div>

                            <div class="h-1.5 overflow-hidden rounded-xs bg-hairline">
                                <div
                                    class="h-full bg-primary transition-all duration-300"
                                    [style.width.%]="runProgressPercent()"
                                ></div>
                            </div>

                            <div class="-mt-1.5 text-[13px] leading-[18px] text-muted">
                                {{ completedCheckCount() }} of {{ totalCheckCount() }} checks complete · Evaluating
                                {{ currentEvaluatingResource() }}
                            </div>

                            <div class="border-t border-hairline">
                                @for (row of runningRows(); track row.resourceName) {
                                    <div
                                        class="grid h-11 grid-cols-[240px_190px_1fr] items-center gap-3 border-b border-hairline text-sm"
                                    >
                                        <span class="font-semibold text-ink">{{ row.resourceName }}</span>
                                        <span
                                            class="flex items-center gap-2 text-[13px]"
                                            [class]="progressStateColor(row)"
                                        >
                                            <span [class]="progressDotClasses(row)"></span>
                                            <span>
                                                {{ row.state === "Evaluating" ? "Evaluating…" : row.state }}
                                            </span>
                                        </span>
                                        <span class="text-[13px] text-muted">{{ row.note }}</span>
                                    </div>
                                }
                            </div>

                            <div class="text-[13px] leading-[18px] text-muted">
                                Findings appear here when the run finishes. AI explanations are added after OPA
                                evaluation.
                            </div>
                        </div>
                    </div>
                } @else {
                    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-7 py-5">
                        <div
                            class="grid shrink-0 grid-cols-2 rounded border border-hairline bg-surface shadow-tile lg:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1.2fr]"
                        >
                            <div class="px-5 py-3.5">
                                <div class="text-[13px] leading-[18px] text-muted">Resources audited</div>
                                <div class="font-metric text-[32px] font-semibold leading-10 text-ink">
                                    {{ readyResourceCount() }}
                                </div>
                                <div class="text-[13px] leading-[18px] text-muted">{{ resultsSourceNote() }}</div>
                            </div>

                            <div class="border-l border-hairline px-5 py-3.5">
                                <div class="text-[13px] leading-[18px] text-muted">Compliance</div>
                                <div class="flex items-baseline gap-5">
                                    <div class="flex items-baseline gap-1.5">
                                        <span class="font-metric text-[32px] font-semibold leading-10 text-ink">
                                            {{ compliantResourceCount() }}
                                        </span>
                                        <span class="text-[13px] text-success">● Compliant</span>
                                    </div>
                                    <div class="flex items-baseline gap-1.5">
                                        <span class="font-metric text-[32px] font-semibold leading-10 text-ink">
                                            {{ nonCompliantResourceCount() }}
                                        </span>
                                        <span class="text-[13px] text-error-text">✕ Non-compliant</span>
                                    </div>
                                </div>
                                <div class="mt-1.5 flex h-1.5 gap-0.5 overflow-hidden rounded-xs">
                                    <span class="bg-success" [style.flex]="compliantResourceCount()"></span>
                                    <span class="bg-error" [style.flex]="nonCompliantResourceCount()"></span>
                                </div>
                            </div>

                            <div class="border-l border-hairline px-5 py-3.5">
                                <div class="flex items-center gap-1.5 text-[13px] leading-[18px] text-error-text">
                                    <span class="size-2 rotate-45 bg-error"></span>
                                    <span>High</span>
                                </div>
                                <div class="font-metric text-[32px] font-semibold leading-10 text-ink">
                                    {{ highFindingsCount() }}
                                </div>
                                <div class="text-[13px] leading-[18px] text-muted">findings</div>
                            </div>

                            <div class="border-l border-hairline px-5 py-3.5">
                                <div class="flex items-center gap-1.5 text-[13px] leading-[18px] text-warning-text">
                                    <span
                                        class="h-0 w-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-warning"
                                    ></span>
                                    <span>Medium</span>
                                </div>
                                <div class="font-metric text-[32px] font-semibold leading-10 text-ink">
                                    {{ mediumFindingsCount() }}
                                </div>
                                <div class="text-[13px] leading-[18px] text-muted">findings</div>
                            </div>

                            <div class="border-l border-hairline px-5 py-3.5">
                                <div class="flex items-center gap-1.5 text-[13px] leading-[18px] text-body">
                                    <span class="size-2.5 rounded-full bg-subtle"></span>
                                    <span>Low</span>
                                </div>
                                <div class="font-metric text-[32px] font-semibold leading-10 text-ink">
                                    {{ lowFindingsCount() }}
                                </div>
                                <div class="text-[13px] leading-[18px] text-muted">findings</div>
                            </div>

                            <div class="border-l border-hairline px-5 py-3.5">
                                <div class="text-[13px] leading-[18px] text-muted">AI judgment calls</div>
                                <div class="font-metric text-[32px] font-semibold leading-10 text-ink">
                                    {{ pendingAiCount() }}
                                </div>
                                <div class="text-[13px] leading-[18px] text-muted">needs a reviewer's decision</div>
                            </div>
                        </div>

                        <div class="flex shrink-0 flex-wrap items-center gap-2.5">
                            <div
                                class="flex h-9 w-[280px] items-center gap-2 rounded-xs border border-border border-b-border-accessible bg-surface px-3 focus-within:border-b-2 focus-within:border-b-primary"
                            >
                                <span class="text-base text-muted">⌕</span>
                                <input
                                    type="text"
                                    [value]="searchQuery()"
                                    (input)="onSearchInput($event)"
                                    placeholder="Search findings"
                                    class="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                                />
                            </div>

                            <div class="relative">
                                <select
                                    aria-label="Filter by severity"
                                    [value]="severityFilter()"
                                    (change)="onSeverityFilterChange($event)"
                                    class="h-7 cursor-pointer appearance-none rounded-full bg-surface-soft pr-7 pl-3 text-[13px] text-ink"
                                >
                                    <option value="All">Severity : All</option>
                                    @for (sev of severityOptions; track sev) {
                                        <option [value]="sev">Severity : {{ sev }}</option>
                                    }
                                </select>
                                <span class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs">
                                    ▾
                                </span>
                            </div>

                            <div class="relative">
                                <select
                                    aria-label="Filter by resource"
                                    [value]="resourceFilter()"
                                    (change)="onResourceFilterChange($event)"
                                    class="h-7 cursor-pointer appearance-none rounded-full bg-surface-soft pr-7 pl-3 text-[13px] text-ink"
                                >
                                    <option value="All">Resource : All</option>
                                    @for (res of resourceFilterOptions(); track res) {
                                        <option [value]="res">Resource : {{ res }}</option>
                                    }
                                </select>
                                <span class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs">
                                    ▾
                                </span>
                            </div>

                            <div class="relative">
                                <select
                                    aria-label="Filter by policy"
                                    [value]="policyFilter()"
                                    (change)="onPolicyFilterChange($event)"
                                    class="h-7 cursor-pointer appearance-none rounded-full bg-surface-soft pr-7 pl-3 text-[13px] text-ink"
                                >
                                    <option value="All">Policy : All</option>
                                    @for (pol of policyFilterOptions(); track pol) {
                                        <option [value]="pol">Policy : {{ pol }}</option>
                                    }
                                </select>
                                <span class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs">
                                    ▾
                                </span>
                            </div>

                            <button
                                type="button"
                                (click)="toggleAiOnlyFilter()"
                                class="flex h-7 cursor-pointer items-center gap-2 rounded-full border px-3 text-[13px] transition"
                                [class]="
                                    aiOnlyFilter()
                                        ? 'border-primary bg-primary-tint font-semibold text-ink'
                                        : 'border-border bg-surface text-ink hover:bg-surface-hover'
                                "
                            >
                                <span
                                    class="flex size-3.5 items-center justify-center rounded-xs text-[10px]"
                                    [class]="
                                        aiOnlyFilter()
                                            ? 'bg-primary text-on-primary'
                                            : 'border border-border-accessible bg-surface text-transparent'
                                    "
                                >
                                    ✓
                                </span>
                                <span>AI judgment calls only</span>
                            </button>

                            <span class="ml-auto text-[13px] text-muted">
                                Showing {{ filteredFindings().length }}
                                {{ filteredFindings().length === 1 ? "finding" : "findings" }} across
                                {{ filteredResourceCount() }} resources
                            </span>
                        </div>

                        <div
                            class="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-hairline bg-surface"
                        >
                            <div
                                class="grid h-11 shrink-0 grid-cols-[110px_380px_160px_minmax(0,1fr)_210px_24px] items-center gap-3 border-b border-border px-4 text-sm font-semibold text-ink"
                            >
                                <span>Severity ↓</span>
                                <span>Policy</span>
                                <span>Resource</span>
                                <span>Reason</span>
                                <span>Review</span>
                                <span></span>
                            </div>

                            <div class="min-h-0 flex-1 overflow-y-auto">
                                @for (finding of filteredFindings(); track finding.id) {
                                    <div
                                        (click)="openFindingDrawer(finding.id)"
                                        class="grid h-11 cursor-pointer grid-cols-[110px_380px_160px_minmax(0,1fr)_210px_24px] items-center gap-3 border-b border-hairline px-4 text-sm transition last:border-b-0"
                                        [class]="
                                            selectedFindingId() === finding.id
                                                ? 'bg-primary-tint'
                                                : 'bg-surface hover:bg-surface-hover'
                                        "
                                    >
                                        <span>
                                            <pl-severity-badge [severity]="finding.severity" />
                                        </span>

                                        <span class="flex min-w-0 items-center gap-2">
                                            <span
                                                class="rounded-xs bg-surface-soft px-1.5 font-mono text-[13px] text-body"
                                            >
                                                {{ finding.policyId }}
                                            </span>
                                            <span class="truncate text-ink">{{ finding.policyTitle }}</span>
                                        </span>

                                        <span class="truncate text-link">{{ finding.resourceName }}</span>

                                        <span class="truncate text-body">{{ finding.reason }}</span>

                                        <span>
                                            @if (finding.isAiJudgmentCall) {
                                                @if (finding.aiDecision === "accepted") {
                                                    <span
                                                        class="inline-flex h-6 items-center gap-1.5 rounded-xs border border-success-border bg-success-tint px-2.5 text-[13px] text-success"
                                                    >
                                                        <span>✓ Accepted as compliant</span>
                                                    </span>
                                                } @else {
                                                    <span
                                                        class="inline-flex h-6 items-center gap-1.5 rounded-xs border border-primary-tint-strong bg-primary-tint px-2.5 text-[13px]"
                                                    >
                                                        <span
                                                            class="size-2 rotate-45 border-[1.5px] border-primary"
                                                        ></span>
                                                        <span>
                                                            AI judgment call ·
                                                            <b class="font-semibold">{{ finding.aiConfidencePercent }}%</b>
                                                        </span>
                                                    </span>
                                                }
                                            }
                                        </span>

                                        <span class="text-muted">›</span>
                                    </div>
                                } @empty {
                                    <div class="px-6 py-10 text-center text-sm text-muted">
                                        No findings match the current filters.
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                }
            }

            @if (activeDrawerFinding(); as activeFinding) {
                <pl-finding-drawer
                    [finding]="activeFinding"
                    [currentIndex]="activeDrawerIndex()"
                    [totalCount]="filteredFindings().length"
                    (closeDrawer)="closeFindingDrawer()"
                    (previousFinding)="goToAdjacentFinding(-1)"
                    (nextFinding)="goToAdjacentFinding(1)"
                    (decideAi)="applyAiDecision(activeFinding.id, $event)"
                    (copyFix)="copyCommand($event)"
                    (openPolicy)="navigateToPolicy($event)"
                />
            }

            @if (isPdfModalOpen()) {
                <pl-pdf-preview-modal
                    [resourceTypeName]="selectedType().name"
                    [sourceLabel]="resourceTab() === 'upload' ? 'JSON upload' : 'Azure subscription'"
                    [resourceRows]="pdfResourceRows"
                    [findings]="findings()"
                    (closeModal)="closePdfModal()"
                    (downloadPdf)="triggerPdfDownload()"
                />
            }
        </div>
    `,
})
export class AuditPage {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly notifications = inject(NotificationService);
    private readonly destroyRef = inject(DestroyRef);

    readonly stepType = AUDIT_STEP_TYPE;
    readonly stepResources = AUDIT_STEP_RESOURCES;
    readonly stepReview = AUDIT_STEP_REVIEW;
    readonly auditTimestamp = DEFAULT_AUDIT_TIMESTAMP;

    readonly resourceTypeOptions = RESOURCE_TYPE_OPTIONS;
    readonly azureAccount = AZURE_ACCOUNT;
    readonly azureSubscriptions = AZURE_SUBSCRIPTIONS;
    readonly severityOptions = SEVERITY_ORDER;
    readonly pdfResourceRows = PDF_RESOURCE_SUMMARIES;

    readonly currentStep = signal<number>(AUDIT_STEP_TYPE);
    readonly selectedTypeId = signal<string>("storage");
    readonly resourceTab = signal<ResourceInputTab>("upload");
    readonly isDraggingOver = signal(false);

    readonly uploadedFiles = signal<UploadedResourceFile[]>(INITIAL_UPLOADED_FILES);
    readonly selectedSubscriptionId = signal<string>(AZURE_SUBSCRIPTIONS[0].id);
    readonly azureFilterQuery = signal<string>("");
    readonly azureResources = signal<AzureResourceRow[]>(INITIAL_AZURE_RESOURCES);

    readonly reviewState = signal<ReviewViewState>("results");
    readonly runProgressPercent = signal<number>(64);
    readonly runningRows = signal<AuditRunProgressRow[]>(MOCK_RUNNING_PROGRESS_ROWS);
    readonly findings = signal<AuditFinding[]>(INITIAL_AUDIT_FINDINGS);

    readonly searchQuery = signal<string>("");
    readonly severityFilter = signal<SeverityFilter>("All");
    readonly resourceFilter = signal<string>("All");
    readonly policyFilter = signal<string>("All");
    readonly aiOnlyFilter = signal(false);

    readonly selectedFindingId = signal<string | null>(null);
    readonly isPdfModalOpen = signal(false);

    private runTimers: number[] = [];

    readonly selectedType = computed<ResourceTypeOption>(() => {
        const typeId = this.selectedTypeId();
        const found = this.resourceTypeOptions.find((option) => option.id === typeId);

        if (found) {
            return found;
        }

        return this.resourceTypeOptions[0];
    });

    readonly selectedSubscription = computed(() => {
        const subId = this.selectedSubscriptionId();
        const found = this.azureSubscriptions.find((sub) => sub.id === subId);

        if (found) {
            return found;
        }

        return this.azureSubscriptions[0];
    });

    readonly filteredAzureResources = computed(() => {
        const query = this.azureFilterQuery().trim().toLowerCase();
        const rows = this.azureResources();

        if (!query) {
            return rows;
        }

        const matched = rows.filter((row) => {
            const matchesName = row.name.toLowerCase().includes(query);
            const matchesGroup = row.resourceGroup.toLowerCase().includes(query);

            return matchesName || matchesGroup;
        });

        return matched;
    });

    readonly selectedAzureCount = computed(() => {
        const selected = this.azureResources().filter((row) => row.selected);

        return selected.length;
    });

    readonly allAzureSelected = computed(() => {
        const rows = this.azureResources();

        return rows.length > 0 && rows.every((row) => row.selected);
    });

    readonly readyUploadedCount = computed(() => {
        const ready = this.uploadedFiles().filter((file) => file.isMatchingType);

        return ready.length;
    });

    readonly mismatchedUploadedCount = computed(() => {
        const mismatched = this.uploadedFiles().filter((file) => !file.isMatchingType);

        return mismatched.length;
    });

    readonly readyResourceCount = computed(() => {
        if (this.resourceTab() === "upload") {
            const count = this.readyUploadedCount();

            return count > 0 ? count : 4;
        }

        const azureCount = this.selectedAzureCount();

        return azureCount > 0 ? azureCount : 4;
    });

    readonly canStartAudit = computed(() => {
        if (this.resourceTab() === "upload") {
            return this.readyUploadedCount() > 0;
        }

        return this.selectedAzureCount() > 0;
    });

    readonly totalCheckCount = computed(() => {
        return this.readyResourceCount() * this.selectedType().policyCount;
    });

    readonly completedCheckCount = computed(() => {
        const ratio = this.runProgressPercent() / 100;

        return Math.round(this.totalCheckCount() * ratio);
    });

    readonly currentEvaluatingResource = computed(() => {
        const rows = this.runningRows();
        const active = rows.find((row) => row.state === "Evaluating");

        if (active) {
            return active.resourceName;
        }

        return rows[rows.length - 1]?.resourceName ?? "resources";
    });

    readonly activeFindings = computed(() => {
        return this.findings().filter((finding) => finding.aiDecision !== "accepted");
    });

    readonly highFindingsCount = computed(() => {
        return this.activeFindings().filter((finding) => finding.severity === "High").length;
    });

    readonly mediumFindingsCount = computed(() => {
        return this.activeFindings().filter((finding) => finding.severity === "Medium").length;
    });

    readonly lowFindingsCount = computed(() => {
        return this.activeFindings().filter((finding) => finding.severity === "Low").length;
    });

    readonly pendingAiCount = computed(() => {
        return this.findings().filter((finding) => finding.isAiJudgmentCall && finding.aiDecision === "pending").length;
    });

    readonly nonCompliantResourceCount = computed(() => {
        const names = new Set(this.activeFindings().map((finding) => finding.resourceName));

        return names.size;
    });

    readonly compliantResourceCount = computed(() => {
        const total = Math.max(this.readyResourceCount(), this.nonCompliantResourceCount());

        return total - this.nonCompliantResourceCount();
    });

    readonly resourceFilterOptions = computed(() => {
        const names = new Set(this.findings().map((finding) => finding.resourceName));

        return Array.from(names);
    });

    readonly policyFilterOptions = computed(() => {
        const ids = new Set(this.findings().map((finding) => finding.policyId));

        return Array.from(ids).sort();
    });

    readonly filteredFindings = computed(() => {
        const query = this.searchQuery().trim().toLowerCase();
        const severity = this.severityFilter();
        const resource = this.resourceFilter();
        const policyId = this.policyFilter();
        const aiOnly = this.aiOnlyFilter();

        const matched = this.findings().filter((finding) => {
            if (severity !== "All" && finding.severity !== severity) {
                return false;
            }

            if (resource !== "All" && finding.resourceName !== resource) {
                return false;
            }

            if (policyId !== "All" && finding.policyId !== policyId) {
                return false;
            }

            if (aiOnly && !finding.isAiJudgmentCall) {
                return false;
            }

            if (query) {
                const haystack = `${finding.policyId} ${finding.policyTitle} ${finding.resourceName} ${finding.reason}`.toLowerCase();

                if (!haystack.includes(query)) {
                    return false;
                }
            }

            return true;
        });

        return matched;
    });

    readonly filteredResourceCount = computed(() => {
        const names = new Set(this.filteredFindings().map((finding) => finding.resourceName));

        return names.size;
    });

    readonly activeDrawerIndex = computed(() => {
        const selectedId = this.selectedFindingId();

        if (!selectedId) {
            return -1;
        }

        const list = this.filteredFindings();

        return list.findIndex((finding) => finding.id === selectedId);
    });

    readonly activeDrawerFinding = computed(() => {
        const index = this.activeDrawerIndex();

        if (index < 0) {
            return null;
        }

        return this.filteredFindings()[index] ?? null;
    });

    readonly headerTitle = computed(() => {
        const step = this.currentStep();

        if (step !== AUDIT_STEP_REVIEW) {
            return "New audit";
        }

        return this.reviewState() === "running" ? "Run audit" : "Audit results";
    });

    readonly headerSubtitle = computed(() => {
        const step = this.currentStep();
        const type = this.selectedType();

        if (step === AUDIT_STEP_TYPE) {
            return "Check Azure resources against the policies loaded in OPA";
        }

        if (step === AUDIT_STEP_RESOURCES) {
            return `${type.name} · ${type.policyCount} ${type.policyCount === 1 ? "policy" : "policies"}`;
        }

        const sourceText = this.resourceTab() === "upload" ? "JSON upload" : "Azure subscription";

        return `${type.name} · ${this.readyResourceCount()} resources from ${sourceText} · ${type.policyCount} policies`;
    });

    readonly stepTwoSummaryBadge = computed(() => {
        if (this.resourceTab() === "upload") {
            const ready = this.readyUploadedCount();

            return `${ready} ${ready === 1 ? "file" : "files"}`;
        }

        const selected = this.selectedAzureCount();

        return `${selected} selected`;
    });

    readonly uploadSummaryText = computed(() => {
        const total = this.uploadedFiles().length;
        const ready = this.readyUploadedCount();
        const skipped = this.mismatchedUploadedCount();

        if (skipped === 0) {
            return `${total} ${total === 1 ? "file" : "files"} · ${ready} ready`;
        }

        return `${total} files · ${ready} ready · ${skipped} can't be audited`;
    });

    readonly stepTwoFooterNote = computed(() => {
        if (this.resourceTab() === "upload") {
            const ready = this.readyUploadedCount();
            const skipped = this.mismatchedUploadedCount();

            if (skipped > 0) {
                return `${ready} resources ready · ${skipped} ${skipped === 1 ? "file" : "files"} will be skipped`;
            }

            return `${ready} ${ready === 1 ? "resource" : "resources"} ready`;
        }

        const total = this.azureResources().length;
        const selected = this.selectedAzureCount();

        return `${selected} of ${total} storage accounts selected · read-only access`;
    });

    readonly resultsSourceNote = computed(() => {
        if (this.resourceTab() === "upload") {
            return `from ${this.readyResourceCount()} JSON files`;
        }

        return `from ${this.selectedSubscription().name}`;
    });

    constructor() {
        const initialView = this.route.snapshot.queryParamMap.get("view");

        if (initialView === "results") {
            this.currentStep.set(AUDIT_STEP_REVIEW);
            this.reviewState.set("results");
        }

        this.destroyRef.onDestroy(() => {
            this.clearRunTimers();
        });
    }

    resetWizard(): void {
        this.clearRunTimers();
        this.selectedFindingId.set(null);
        this.isPdfModalOpen.set(false);
        this.currentStep.set(AUDIT_STEP_TYPE);
    }

    jumpToStep(step: number): void {
        const canJump = step < this.currentStep();

        if (!canJump) {
            return;
        }

        this.clearRunTimers();
        this.selectedFindingId.set(null);
        this.currentStep.set(step);
    }

    selectResourceType(option: ResourceTypeOption): void {
        if (!option.isEnabled) {
            return;
        }

        this.selectedTypeId.set(option.id);
    }

    goToResourcesStep(): void {
        this.currentStep.set(AUDIT_STEP_RESOURCES);
    }

    goToTypeStep(): void {
        this.currentStep.set(AUDIT_STEP_TYPE);
    }

    setResourceTab(tab: ResourceInputTab): void {
        this.resourceTab.set(tab);
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.isDraggingOver.set(true);
    }

    onDragLeave(): void {
        this.isDraggingOver.set(false);
    }

    onFileDrop(event: DragEvent): void {
        event.preventDefault();
        this.isDraggingOver.set(false);

        const files = event.dataTransfer?.files;

        if (files && files.length > 0) {
            void this.ingestFiles(files);
        }
    }

    onFileInputChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const files = input.files;

        if (files && files.length > 0) {
            void this.ingestFiles(files);
        }

        input.value = "";
    }

    removeUploadedFile(fileId: string): void {
        this.uploadedFiles.update((files) => files.filter((file) => file.id !== fileId));
    }

    onSubscriptionChange(event: Event): void {
        const select = event.target as HTMLSelectElement;

        this.selectedSubscriptionId.set(select.value);
    }

    onAzureFilterInput(event: Event): void {
        const input = event.target as HTMLInputElement;

        this.azureFilterQuery.set(input.value);
    }

    toggleAzureResource(resourceId: string): void {
        this.azureResources.update((rows) =>
            rows.map((row) => {
                if (row.id !== resourceId) {
                    return row;
                }

                return {
                    id: row.id,
                    name: row.name,
                    resourceGroup: row.resourceGroup,
                    location: row.location,
                    lastModified: row.lastModified,
                    selected: !row.selected,
                };
            }),
        );
    }

    toggleAllAzureResources(): void {
        const shouldSelectAll = !this.allAzureSelected();

        this.azureResources.update((rows) =>
            rows.map((row) => ({
                id: row.id,
                name: row.name,
                resourceGroup: row.resourceGroup,
                location: row.location,
                lastModified: row.lastModified,
                selected: shouldSelectAll,
            })),
        );
    }

    notifySwitchAccount(): void {
        this.notifications.showSuccess("Account switching will be enabled with Microsoft Entra sign-in");
    }

    startAuditRun(): void {
        this.clearRunTimers();
        this.selectedFindingId.set(null);
        this.currentStep.set(AUDIT_STEP_REVIEW);
        this.reviewState.set("running");
        this.runProgressPercent.set(64);
        this.runningRows.set(MOCK_RUNNING_PROGRESS_ROWS);

        const midTimer = window.setTimeout(() => {
            this.runProgressPercent.set(89);
            this.runningRows.set([
                { resourceName: "stgprodassets01", state: "Done", note: "7 of 7 checks · 5 findings" },
                { resourceName: "stglogsweu01", state: "Done", note: "7 of 7 checks · 3 findings" },
                { resourceName: "stgbackups02", state: "Done", note: "7 of 7 checks · 4 findings" },
                { resourceName: "stgarchive03", state: "Evaluating", note: "4 of 7 checks" },
            ]);
        }, AUDIT_RUN_STEP_DELAY_MS);

        const doneTimer = window.setTimeout(() => {
            this.runProgressPercent.set(100);
            this.reviewState.set("results");
        }, AUDIT_RUN_STEP_DELAY_MS * 2);

        this.runTimers = [midTimer, doneTimer];
    }

    cancelRunningAudit(): void {
        this.clearRunTimers();
        this.currentStep.set(AUDIT_STEP_RESOURCES);
    }

    onSearchInput(event: Event): void {
        const input = event.target as HTMLInputElement;

        this.searchQuery.set(input.value);
    }

    onSeverityFilterChange(event: Event): void {
        const select = event.target as HTMLSelectElement;

        this.severityFilter.set(select.value as SeverityFilter);
    }

    onResourceFilterChange(event: Event): void {
        const select = event.target as HTMLSelectElement;

        this.resourceFilter.set(select.value);
    }

    onPolicyFilterChange(event: Event): void {
        const select = event.target as HTMLSelectElement;

        this.policyFilter.set(select.value);
    }

    toggleAiOnlyFilter(): void {
        this.aiOnlyFilter.update((current) => !current);
    }

    openFindingDrawer(findingId: string): void {
        this.selectedFindingId.set(findingId);
    }

    closeFindingDrawer(): void {
        this.selectedFindingId.set(null);
    }

    goToAdjacentFinding(offset: number): void {
        const list = this.filteredFindings();
        const nextIndex = this.activeDrawerIndex() + offset;
        const target = list[nextIndex];

        if (!target) {
            return;
        }

        this.selectedFindingId.set(target.id);
    }

    applyAiDecision(findingId: string, decision: Exclude<AiDecision, "pending">): void {
        this.findings.update((list) =>
            list.map((finding) => {
                if (finding.id !== findingId) {
                    return finding;
                }

                return {
                    id: finding.id,
                    policyId: finding.policyId,
                    policyTitle: finding.policyTitle,
                    severity: finding.severity,
                    resourceName: finding.resourceName,
                    resourceType: finding.resourceType,
                    resourceGroup: finding.resourceGroup,
                    reason: finding.reason,
                    explanation: finding.explanation,
                    fieldChecked: finding.fieldChecked,
                    ruleDescription: finding.ruleDescription,
                    actualJson: finding.actualJson,
                    expectedJson: finding.expectedJson,
                    fixSummary: finding.fixSummary,
                    fixCommand: finding.fixCommand,
                    regoFilePath: finding.regoFilePath,
                    regoFileName: finding.regoFileName,
                    regoLineStart: finding.regoLineStart,
                    regoLineEnd: finding.regoLineEnd,
                    isAiJudgmentCall: finding.isAiJudgmentCall,
                    aiConfidencePercent: finding.aiConfidencePercent,
                    aiNote: finding.aiNote,
                    aiDecision: decision,
                };
            }),
        );

        const message =
            decision === "accepted" ? "Marked finding as compliant" : "Kept finding in audit results";

        this.notifications.showSuccess(message);
    }

    async copyCommand(command: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(command);
            this.notifications.showSuccess(COPY_SUCCESS_MESSAGE);
        } catch {
            this.notifications.showError("Could not copy command to clipboard");
        }
    }

    navigateToPolicy(finding: AuditFinding): void {
        this.closeFindingDrawer();
        void this.router.navigate(["/policies"], {
            queryParams: {
                file: finding.regoFileName,
                line: finding.regoLineStart,
            },
        });
    }

    openPdfModal(): void {
        this.isPdfModalOpen.set(true);
    }

    closePdfModal(): void {
        this.isPdfModalOpen.set(false);
    }

    triggerPdfDownload(): void {
        this.isPdfModalOpen.set(false);
        this.notifications.showSuccess(PDF_DOWNLOAD_MESSAGE);
    }

    resourceCardClasses(option: ResourceTypeOption): string {
        const isSelected = this.selectedTypeId() === option.id;

        if (isSelected) {
            return "relative flex cursor-pointer flex-col gap-3 rounded border-2 border-primary bg-primary-tint p-[19px] text-left";
        }

        return "relative flex cursor-pointer flex-col gap-3 rounded border border-border bg-surface p-5 text-left shadow-tile-hover transition";
    }

    resourceRadioClasses(option: ResourceTypeOption): string {
        const isSelected = this.selectedTypeId() === option.id;

        if (isSelected) {
            return "absolute top-[15px] right-[15px] size-[18px] rounded-full border-[5px] border-primary bg-surface";
        }

        return "absolute top-4 right-4 size-[18px] rounded-full border border-border-accessible";
    }

    resourceAvatarClasses(option: ResourceTypeOption): string {
        const isSelected = this.selectedTypeId() === option.id;

        if (isSelected) {
            return "flex size-9 items-center justify-center rounded bg-primary text-[13px] font-semibold text-on-primary";
        }

        return "flex size-9 items-center justify-center rounded bg-primary-tint-strong text-[13px] font-semibold text-primary";
    }

    resourceTabClasses(tab: ResourceInputTab): string {
        const isActive = this.resourceTab() === tab;

        if (isActive) {
            return "-mb-px flex h-10 cursor-pointer items-center border-b-2 border-primary font-semibold text-ink";
        }

        return "flex h-10 cursor-pointer items-center text-body hover:text-ink";
    }

    dropZoneClasses(): string {
        if (this.isDraggingOver()) {
            return "flex h-[148px] flex-col items-center justify-center gap-2 rounded border border-dashed border-primary bg-primary-tint";
        }

        return "flex h-[148px] flex-col items-center justify-center gap-2 rounded border border-dashed border-border-accessible bg-surface";
    }

    progressStateColor(row: AuditRunProgressRow): string {
        switch (row.state) {
            case "Done":
                return "text-success";
            case "Evaluating":
                return "text-primary";
            case "Queued":
                return "text-muted";
        }
    }

    progressDotClasses(row: AuditRunProgressRow): string {
        switch (row.state) {
            case "Done":
                return "size-2.5 rounded-full bg-success";
            case "Evaluating":
                return "size-2.5 rounded-full border-2 border-primary bg-surface";
            case "Queued":
                return "size-2.5 rounded-full border border-subtle bg-surface";
        }
    }

    private clearRunTimers(): void {
        for (const timerId of this.runTimers) {
            window.clearTimeout(timerId);
        }

        this.runTimers = [];
    }

    private async ingestFiles(fileList: FileList): Promise<void> {
        const selectedOption = this.selectedType();
        const incoming: UploadedResourceFile[] = [];

        for (let index = 0; index < fileList.length; index += 1) {
            const file = fileList.item(index);

            if (!file) {
                continue;
            }

            if (file.size > MAX_UPLOAD_SIZE_BYTES) {
                this.notifications.showError(`${file.name} exceeds the 5 MB file limit`);
                continue;
            }

            const sizeKb = Math.max(0.1, file.size / BYTES_PER_KB).toFixed(1);
            const fallbackName = file.name.replace(/\.json$/i, "");

            try {
                const rawText = await file.text();
                const parsed = JSON.parse(rawText) as { name?: string; type?: string } | { name?: string; type?: string }[];
                const firstEntry = Array.isArray(parsed) ? parsed[0] : parsed;
                const resourceName = firstEntry?.name ?? fallbackName;
                const azureType = firstEntry?.type ?? selectedOption.azureType;
                const isMatching = azureType.toLowerCase() === selectedOption.azureType.toLowerCase();

                incoming.push({
                    id: `up-${Date.now()}-${index}`,
                    fileName: file.name,
                    resourceName,
                    detectedType: isMatching ? selectedOption.name : azureType,
                    detectedAzureType: azureType,
                    sizeLabel: `${sizeKb} KB`,
                    isMatchingType: isMatching,
                    mismatchReason: isMatching
                        ? undefined
                        : `This file contains ${azureType}, but this audit checks ${selectedOption.name}s.`,
                });
            } catch {
                incoming.push({
                    id: `up-${Date.now()}-${index}`,
                    fileName: file.name,
                    resourceName: fallbackName,
                    detectedType: "Invalid JSON",
                    detectedAzureType: "unknown",
                    sizeLabel: `${sizeKb} KB`,
                    isMatchingType: false,
                    mismatchReason: "Could not parse JSON in this file.",
                });
            }
        }

        if (incoming.length > 0) {
            this.uploadedFiles.update((existing) => [...existing, ...incoming]);
        }
    }
}
