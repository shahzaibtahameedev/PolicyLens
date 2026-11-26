import {
    ChangeDetectionStrategy,
    Component,
    computed,
    HostListener,
    inject,
    signal,
    viewChild,
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import {
    COPY_SUCCESS_MESSAGE,
    OPA_ENDPOINT_LABEL,
    REGO_LANGUAGE_ID,
    RELOAD_OPA_SUCCESS_MESSAGE,
} from "../../core/constants";
import { POLICY_COVERAGE_CARDS } from "../../core/mock-data";
import type { EditorMarker, PolicyFileRecord, PolicyRuleItem, RegoValidationError } from "../../core/models";
import { NotificationService } from "../../core/notification.service";
import { PolicyStoreService } from "../../core/policy-store.service";
import { CodeEditor, type CursorPosition } from "../../shared/code-editor/code-editor";
import { SeverityBadge } from "../../shared/severity-badge/severity-badge";
import { UnsavedChangesDialog } from "./unsaved-changes-dialog";

type PolicyViewMode = "list" | "editor";

interface PendingLeaveAction {
    destinationLabel: string;
    resolve: (allowLeave: boolean) => void;
}

@Component({
    selector: "pl-policies-page",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, CodeEditor, SeverityBadge, UnsavedChangesDialog],
    template: `
        <div class="flex h-full flex-col overflow-hidden bg-canvas text-ink">
            @if (viewMode() === "list") {
                <div class="flex h-9 shrink-0 items-center gap-1.5 px-7 text-[13px] text-muted">
                    <a routerLink="/dashboard" class="text-link no-underline hover:text-link-hover">PolicyLens</a>
                    <span>›</span>
                    <span>Policies</span>
                </div>

                <div class="shrink-0 px-7 pb-3.5">
                    <h1 class="text-2xl font-semibold leading-8 text-ink">Policies</h1>
                    <p class="mt-0.5 text-[13px] leading-[18px] text-muted">
                        Rego files loaded in Open Policy Agent at
                        <span class="font-mono">{{ opaEndpoint }}</span>
                    </p>
                </div>

                <div class="flex h-11 shrink-0 items-center gap-1.5 border-y border-hairline bg-surface px-5">
                    <label
                        class="flex h-9 cursor-pointer items-center gap-2 rounded-xs px-2.5 text-sm text-ink hover:bg-surface-hover"
                    >
                        <span class="text-base text-primary">+</span>
                        <span>Upload policy file</span>
                        <input
                            type="file"
                            accept=".rego,text/plain"
                            class="sr-only"
                            (change)="onUploadPolicyFile($event)"
                        />
                    </label>

                    <button
                        type="button"
                        (click)="reloadFromOpa()"
                        class="flex h-9 cursor-pointer items-center gap-2 rounded-xs px-2.5 text-sm text-ink hover:bg-surface-hover"
                    >
                        <span class="text-primary">↻</span>
                        <span>Reload from OPA</span>
                    </button>
                </div>

                <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-7 py-5">
                    <div class="flex flex-wrap items-center gap-2.5">
                        <div
                            class="flex h-9 w-[300px] items-center gap-2 rounded-xs border border-border border-b-border-accessible bg-surface px-3 focus-within:border-b-2 focus-within:border-b-primary"
                        >
                            <span class="text-base text-muted">⌕</span>
                            <input
                                type="text"
                                [value]="filterQuery()"
                                (input)="onFilterInput($event)"
                                placeholder="Filter by file, package or rule"
                                class="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                            />
                        </div>

                        <div class="relative">
                            <select
                                aria-label="Filter by resource type"
                                [value]="resourceTypeFilter()"
                                (change)="onResourceTypeFilterChange($event)"
                                class="h-7 cursor-pointer appearance-none rounded-full border border-hairline bg-surface pr-7 pl-3 text-[13px] text-ink"
                            >
                                <option value="All">Resource type : All</option>
                                @for (typeName of availableResourceTypes(); track typeName) {
                                    <option [value]="typeName">Resource type : {{ typeName }}</option>
                                }
                            </select>
                            <span class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs">
                                ▾
                            </span>
                        </div>

                        <span class="ml-auto text-[13px] text-muted">
                            Showing {{ filteredFiles().length }}
                            {{ filteredFiles().length === 1 ? "file" : "files" }} · {{ filteredRuleCount() }} rules
                        </span>
                    </div>

                    <div class="overflow-hidden rounded border border-hairline bg-surface">
                        <div
                            class="grid h-11 grid-cols-[210px_280px_80px_minmax(0,1fr)_230px_90px] items-center gap-3 border-b border-border px-5 text-sm font-semibold text-ink"
                        >
                            <span>File name ↑</span>
                            <span>Rego package</span>
                            <span>Rules</span>
                            <span>Applies to</span>
                            <span>Last updated</span>
                            <span></span>
                        </div>

                        @for (file of filteredFiles(); track file.id) {
                            <div
                                (click)="openPolicyFile(file.id)"
                                class="grid min-h-[54px] cursor-pointer grid-cols-[210px_280px_80px_minmax(0,1fr)_230px_90px] items-center gap-3 border-b border-hairline px-5 py-2 text-sm transition last:border-b-0 hover:bg-surface-hover"
                            >
                                <span class="font-semibold text-link">{{ file.fileName }}</span>
                                <span class="truncate font-mono text-[13px] text-body">{{ file.packageName }}</span>
                                <span>{{ file.rules.length }}</span>
                                <span class="flex flex-wrap gap-1.5">
                                    @for (typeTag of file.appliesTo; track typeTag) {
                                        <span
                                            class="flex h-7 items-center rounded-full bg-surface-soft px-3 text-[13px]"
                                        >
                                            {{ typeTag }}
                                        </span>
                                    }
                                </span>
                                <span class="flex flex-col">
                                    <span>{{ file.updatedDate }}</span>
                                    <span class="text-[13px] leading-[18px] text-muted">{{ file.updatedBy }}</span>
                                </span>
                                <button
                                    type="button"
                                    (click)="openPolicyFile(file.id); $event.stopPropagation()"
                                    class="h-8 cursor-pointer rounded-xs border border-border bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-surface-hover"
                                >
                                    View
                                </button>
                            </div>
                        } @empty {
                            <div class="px-6 py-9 text-center text-sm text-muted">
                                No policy files match your filter.
                            </div>
                        }
                    </div>

                    <div class="mt-2 text-base font-semibold text-ink">Coverage by resource type</div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        @for (card of coverageCards; track card.resourceType) {
                            @if (card.hasPolicies) {
                                <div class="rounded border border-hairline bg-surface px-5 py-4">
                                    <div class="text-[13px] leading-[18px] text-muted">{{ card.resourceType }}</div>
                                    <div class="font-metric text-[32px] font-semibold leading-10 text-ink">
                                        {{ card.ruleCount }}
                                    </div>
                                    <div class="text-[13px] leading-[18px] text-muted">{{ card.subtitle }}</div>
                                </div>
                            } @else {
                                <div class="rounded border border-dashed border-border bg-surface-soft px-5 py-4">
                                    <div class="text-[13px] leading-[18px] text-muted">{{ card.resourceType }}</div>
                                    <div class="font-metric text-[32px] font-semibold leading-10 text-disabled-text">
                                        0
                                    </div>
                                    <div class="text-[13px] leading-[18px]">
                                        <span class="text-muted">{{ card.subtitle }} · </span>
                                        <label class="cursor-pointer text-link hover:text-link-hover">
                                            Upload a file
                                            <input
                                                type="file"
                                                accept=".rego,text/plain"
                                                class="sr-only"
                                                (change)="onUploadPolicyFile($event)"
                                            />
                                        </label>
                                    </div>
                                </div>
                            }
                        }
                    </div>
                </div>
            } @else if (selectedFile(); as file) {
                <div class="flex h-9 shrink-0 items-center gap-1.5 px-7 text-[13px] text-muted">
                    <a routerLink="/dashboard" class="text-link no-underline hover:text-link-hover">PolicyLens</a>
                    <span>›</span>
                    <button
                        type="button"
                        (click)="backToPoliciesList()"
                        class="cursor-pointer text-link hover:text-link-hover"
                    >
                        Policies
                    </button>
                    <span>›</span>
                    <span>{{ file.fileName }}</span>
                </div>

                <div class="flex shrink-0 items-center justify-between px-7 pb-3.5">
                    <div>
                        <div class="flex items-center gap-3">
                            <h1 class="text-2xl font-semibold leading-8 text-ink">{{ file.fileName }}</h1>

                            @if (!isEditing()) {
                                <span
                                    class="inline-flex h-6 items-center gap-1.5 rounded-full bg-surface-soft px-2.5 text-[13px] text-body"
                                >
                                    <span class="h-2 w-2.5 rounded-[1px] border-[1.5px] border-muted"></span>
                                    <span>Read-only</span>
                                </span>
                            } @else if (isDirty()) {
                                <span
                                    class="inline-flex h-6 items-center gap-1.5 rounded-full bg-warning-tint px-2.5 text-[13px] text-warning-text"
                                >
                                    <span class="size-2 rounded-full bg-warning"></span>
                                    <span>Unsaved changes</span>
                                </span>
                            }
                        </div>

                        <p class="mt-0.5 text-[13px] leading-[18px] text-muted">
                            package
                            <span class="font-mono">{{ file.packageName }}</span>
                            · {{ file.rules.length }} {{ file.rules.length === 1 ? "rule" : "rules" }} ·
                            {{ file.appliesToSummary }} · Updated {{ file.updatedDate }} by {{ file.updatedBy }}
                        </p>
                    </div>
                </div>

                <div class="flex h-11 shrink-0 items-center gap-1.5 border-y border-hairline bg-surface px-5">
                    @if (!isEditing()) {
                        <div class="flex items-center gap-1.5">
                            <button
                                type="button"
                                (click)="startEditing()"
                                class="flex h-8 cursor-pointer items-center gap-2 rounded-xs bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover"
                            >
                                <span>✎</span>
                                <span>Edit</span>
                            </button>
                            <button
                                type="button"
                                (click)="downloadPolicyFile(file)"
                                class="flex h-9 cursor-pointer items-center gap-2 rounded-xs px-2.5 text-sm text-ink hover:bg-surface-hover"
                            >
                                <span class="text-primary">↓</span>
                                <span>Download</span>
                            </button>
                            <button
                                type="button"
                                (click)="copyPolicyCode(file)"
                                class="flex h-9 cursor-pointer items-center gap-2 rounded-xs px-2.5 text-sm text-ink hover:bg-surface-hover"
                            >
                                <span class="text-primary">⧉</span>
                                <span>Copy</span>
                            </button>
                            <button
                                type="button"
                                (click)="reloadFromOpa()"
                                class="flex h-9 cursor-pointer items-center gap-2 rounded-xs px-2.5 text-sm text-ink hover:bg-surface-hover"
                            >
                                <span class="text-primary">↻</span>
                                <span>Reload from OPA</span>
                            </button>
                        </div>
                    } @else {
                        <div class="flex items-center gap-2.5">
                            <button
                                type="button"
                                (click)="savePolicy()"
                                class="h-8 cursor-pointer rounded-xs bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                (click)="cancelEditing()"
                                class="h-8 cursor-pointer rounded-xs border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-hover"
                            >
                                Cancel
                            </button>
                            <span class="ml-2 text-[13px] text-muted">
                                OPA validates the file when you save. Nothing changes until it's accepted.
                            </span>
                        </div>
                    }
                </div>

                <div class="flex min-h-0 flex-1 flex-col gap-3.5 px-7 py-5">
                    @if (validationError(); as error) {
                        <div class="flex shrink-0 items-center gap-3 rounded bg-error-tint px-4 py-2.5 text-sm">
                            <span
                                class="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-error text-[11px] leading-[18px] text-white"
                            >
                                ✕
                            </span>
                            <span>
                                <b class="font-semibold">OPA rejected this policy.</b>
                                Line {{ error.line }}, column {{ error.column }}: {{ error.message }}. Your changes
                                haven't been saved.
                            </span>
                            <button
                                type="button"
                                (click)="jumpToError(error)"
                                class="ml-auto cursor-pointer font-semibold text-link hover:text-link-hover"
                            >
                                Go to line {{ error.line }}
                            </button>
                        </div>
                    }

                    @if (savedNoticeRuleCount(); as savedCount) {
                        <div class="flex shrink-0 items-center gap-3 rounded bg-success-tint px-4 py-2.5 text-sm">
                            <span
                                class="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-success text-[11px] leading-[18px] text-white"
                            >
                                ✓
                            </span>
                            <span>
                                <b class="font-semibold">{{ file.fileName }} saved.</b>
                                OPA accepted and reloaded the policy — {{ savedCount }}
                                {{ savedCount === 1 ? "rule" : "rules" }} active. New audits use this version.
                            </span>
                            <button
                                type="button"
                                (click)="dismissSavedNotice()"
                                aria-label="Dismiss saved notice"
                                class="ml-auto cursor-pointer text-body hover:text-ink"
                            >
                                ✕
                            </button>
                        </div>
                    }

                    <div class="flex min-h-0 flex-1 gap-4">
                        <div
                            class="flex min-w-0 flex-1 flex-col overflow-hidden rounded border bg-dark-canvas"
                            [class]="isEditing() ? 'border-primary' : 'border-dark-canvas'"
                        >
                            <div class="flex h-10 shrink-0 items-stretch bg-dark-surface-deep">
                                <div
                                    class="flex items-center gap-2 border-t-2 bg-dark-canvas px-4 text-sm text-dark-ink"
                                    [class]="isEditing() ? 'border-t-dark-link' : 'border-t-dark-canvas'"
                                >
                                    <span class="font-mono text-xs text-dark-link">&#123;&#125;</span>
                                    <span>{{ file.fileName }}</span>
                                    @if (isDirty()) {
                                        <span class="text-dark-muted">●</span>
                                    }
                                </div>
                                <div class="ml-auto flex items-center px-4 text-[13px] text-dark-muted">
                                    {{ file.filePath }}
                                </div>
                            </div>

                            <div class="min-h-0 flex-1">
                                <pl-code-editor
                                    [(value)]="draftCode"
                                    [language]="regoLanguageId"
                                    [readOnly]="!isEditing()"
                                    [markers]="editorMarkers()"
                                    (cursorChanged)="onCursorChanged($event)"
                                />
                            </div>

                            @if (validationError(); as error) {
                                <div
                                    class="flex h-8 shrink-0 items-center gap-3 border-t border-dark-hairline bg-dark-surface-deep px-3.5 text-[13px] text-dark-body"
                                >
                                    <span class="font-semibold text-[#f14c4c]">✕ 1 problem</span>
                                    <span class="font-mono">{{ error.code }}: {{ error.message }}</span>
                                    <span class="text-dark-muted">
                                        {{ file.fileName }} [Ln {{ error.line }}, Col {{ error.column }}]
                                    </span>
                                </div>
                            }

                            <div
                                class="flex h-7 shrink-0 items-center gap-4 px-3.5 text-[13px] text-dark-ink"
                                [class]="statusBarBackgroundClass()"
                            >
                                <span>{{ statusBarModeText() }}</span>
                                <span class="ml-auto">
                                    Ln {{ cursorPosition().line }}, Col {{ cursorPosition().column }}
                                </span>
                                <span>Rego</span>
                                <span>UTF-8</span>
                            </div>
                        </div>

                        <aside
                            class="flex w-[350px] shrink-0 flex-col overflow-hidden rounded border border-hairline bg-surface"
                        >
                            <div class="shrink-0 border-b border-hairline px-5 py-3.5">
                                <div class="text-[15px] font-semibold leading-5 text-ink">Rules in this file</div>
                                <div class="mt-0.5 text-[13px] leading-[18px] text-muted">
                                    @if (isEditing()) {
                                        Rules list refreshes after a successful save
                                    } @else {
                                        {{ file.rules.length }} {{ file.rules.length === 1 ? "rule" : "rules" }} ·
                                        select one to jump to its code
                                    }
                                </div>
                            </div>

                            <div class="min-h-0 flex-1 overflow-y-auto">
                                @for (rule of file.rules; track rule.id) {
                                    <button
                                        type="button"
                                        (click)="selectRule(rule)"
                                        class="flex w-full cursor-pointer flex-col gap-1.5 border-b border-hairline px-5 py-3 text-left text-sm transition last:border-b-0 hover:bg-surface-hover"
                                        [class]="
                                            selectedRuleId() === rule.id && !isEditing()
                                                ? 'bg-primary-tint'
                                                : 'bg-surface'
                                        "
                                    >
                                        <div class="flex w-full items-center gap-2">
                                            <span
                                                class="rounded-xs bg-surface-soft px-2 font-mono text-[13px] text-body"
                                            >
                                                {{ rule.id }}
                                            </span>
                                            <pl-severity-badge [severity]="rule.severity" />
                                            <span class="ml-auto text-[13px] text-muted">Line {{ rule.line }}</span>
                                        </div>
                                        <div class="text-pretty text-ink">{{ rule.title }}</div>
                                    </button>
                                }
                            </div>
                        </aside>
                    </div>
                </div>
            }

            @if (pendingLeaveAction(); as leaveAction) {
                <pl-unsaved-changes-dialog
                    [fileName]="selectedFile()?.fileName ?? 'policy.rego'"
                    [changedLineCount]="changedLineCount()"
                    [destinationLabel]="leaveAction.destinationLabel"
                    (keepEditing)="resolvePendingLeave(false)"
                    (discardChanges)="discardAndLeave()"
                    (saveAndLeave)="saveAndLeave()"
                />
            }
        </div>
    `,
})
export class PoliciesPage {
    private readonly policyStore = inject(PolicyStoreService);
    private readonly notifications = inject(NotificationService);
    private readonly route = inject(ActivatedRoute);
    private readonly editor = viewChild(CodeEditor);

    readonly opaEndpoint = OPA_ENDPOINT_LABEL;
    readonly regoLanguageId = REGO_LANGUAGE_ID;
    readonly coverageCards = POLICY_COVERAGE_CARDS;
    readonly policyFiles = this.policyStore.policyFiles;

    readonly viewMode = signal<PolicyViewMode>("list");
    readonly filterQuery = signal<string>("");
    readonly resourceTypeFilter = signal<string>("All");

    readonly selectedFileId = signal<string>("storage.rego");
    readonly draftCode = signal<string>("");
    readonly isEditing = signal(false);
    readonly validationError = signal<RegoValidationError | null>(null);
    readonly savedNoticeRuleCount = signal<number | null>(null);
    readonly selectedRuleId = signal<string | null>("05");
    readonly cursorPosition = signal<CursorPosition>({ line: 23, column: 1 });
    readonly pendingLeaveAction = signal<PendingLeaveAction | null>(null);

    readonly selectedFile = computed<PolicyFileRecord | null>(() => {
        const fileId = this.selectedFileId();
        const found = this.policyStore.findById(fileId);

        return found ?? null;
    });

    readonly isDirty = computed(() => {
        const file = this.selectedFile();

        if (!file) {
            return false;
        }

        return file.code !== this.draftCode();
    });

    readonly changedLineCount = computed(() => {
        const file = this.selectedFile();

        if (!file) {
            return 0;
        }

        const originalLines = file.code.split("\n");
        const draftLines = this.draftCode().split("\n");
        const maxLength = Math.max(originalLines.length, draftLines.length);
        let changed = 0;

        for (let index = 0; index < maxLength; index += 1) {
            if (originalLines[index] !== draftLines[index]) {
                changed += 1;
            }
        }

        return Math.max(1, changed);
    });

    readonly editorMarkers = computed<EditorMarker[]>(() => {
        const error = this.validationError();

        if (!error) {
            return [];
        }

        return [{ row: error.line, col: error.column, message: error.message }];
    });

    readonly availableResourceTypes = computed(() => {
        const types = new Set<string>();

        for (const file of this.policyFiles()) {
            for (const typeName of file.appliesTo) {
                types.add(typeName);
            }
        }

        return Array.from(types);
    });

    readonly filteredFiles = computed(() => {
        const query = this.filterQuery().trim().toLowerCase();
        const typeFilter = this.resourceTypeFilter();

        return this.policyFiles().filter((file) => {
            if (typeFilter !== "All" && !file.appliesTo.includes(typeFilter)) {
                return false;
            }

            if (!query) {
                return true;
            }

            const ruleText = file.rules.map((rule) => `${rule.id} ${rule.title}`).join(" ");
            const haystack = `${file.fileName} ${file.packageName} ${ruleText}`.toLowerCase();

            return haystack.includes(query);
        });
    });

    readonly filteredRuleCount = computed(() => {
        let total = 0;

        for (const file of this.filteredFiles()) {
            total += file.rules.length;
        }

        return total;
    });

    constructor() {
        const requestedFile = this.route.snapshot.queryParamMap.get("file");
        const requestedLine = this.route.snapshot.queryParamMap.get("line");

        if (requestedFile) {
            const matched = this.policyStore.findById(requestedFile);

            if (matched) {
                this.openPolicyFile(matched.id, requestedLine ? Number(requestedLine) : undefined);
            }
        }
    }

    @HostListener("document:keydown", ["$event"])
    handleKeydown(event: KeyboardEvent): void {
        const isSaveShortcut = event.key === "s" && (event.ctrlKey || event.metaKey);

        if (!isSaveShortcut || !this.isEditing()) {
            return;
        }

        event.preventDefault();
        this.savePolicy();
    }

    canLeavePage(destinationLabel: string): Promise<boolean> {
        const needsConfirmation = this.viewMode() === "editor" && this.isEditing() && this.isDirty();

        if (!needsConfirmation) {
            return Promise.resolve(true);
        }

        return new Promise<boolean>((resolve) => {
            this.pendingLeaveAction.set({ destinationLabel, resolve });
        });
    }

    onFilterInput(event: Event): void {
        const input = event.target as HTMLInputElement;

        this.filterQuery.set(input.value);
    }

    onResourceTypeFilterChange(event: Event): void {
        const select = event.target as HTMLSelectElement;

        this.resourceTypeFilter.set(select.value);
    }

    openPolicyFile(fileId: string, jumpLine?: number): void {
        const file = this.policyStore.findById(fileId);

        if (!file) {
            return;
        }

        this.selectedFileId.set(file.id);
        this.draftCode.set(file.code);
        this.isEditing.set(false);
        this.validationError.set(null);
        this.savedNoticeRuleCount.set(null);
        this.selectedRuleId.set(file.rules[0]?.id ?? null);
        this.viewMode.set("editor");

        if (jumpLine && Number.isFinite(jumpLine)) {
            const matchingRule = file.rules.find((rule) => rule.line === jumpLine);

            if (matchingRule) {
                this.selectedRuleId.set(matchingRule.id);
            }

            window.setTimeout(() => {
                this.editor()?.revealPosition(jumpLine, 1);
            }, 120);
        }
    }

    async backToPoliciesList(): Promise<void> {
        const allowed = await this.canLeavePage("Policies");

        if (!allowed) {
            return;
        }

        this.isEditing.set(false);
        this.validationError.set(null);
        this.savedNoticeRuleCount.set(null);
        this.viewMode.set("list");
    }

    startEditing(): void {
        this.savedNoticeRuleCount.set(null);
        this.isEditing.set(true);
    }

    cancelEditing(): void {
        const file = this.selectedFile();

        if (file) {
            this.draftCode.set(file.code);
        }

        this.isEditing.set(false);
        this.validationError.set(null);
    }

    savePolicy(): boolean {
        const file = this.selectedFile();

        if (!file) {
            return false;
        }

        const code = this.draftCode();
        const error = this.policyStore.validateRego(code);

        if (error) {
            this.validationError.set(error);
            this.savedNoticeRuleCount.set(null);

            return false;
        }

        const updated = this.policyStore.savePolicy(file.id, code);

        this.validationError.set(null);
        this.isEditing.set(false);
        this.savedNoticeRuleCount.set(updated?.rules.length ?? file.rules.length);

        return true;
    }

    dismissSavedNotice(): void {
        this.savedNoticeRuleCount.set(null);
    }

    selectRule(rule: PolicyRuleItem): void {
        this.selectedRuleId.set(rule.id);
        this.editor()?.revealPosition(rule.line, 1);
    }

    jumpToError(error: RegoValidationError): void {
        this.editor()?.revealPosition(error.line, error.column);
    }

    onCursorChanged(position: CursorPosition): void {
        this.cursorPosition.set(position);
    }

    reloadFromOpa(): void {
        this.notifications.showSuccess(RELOAD_OPA_SUCCESS_MESSAGE);
    }

    async copyPolicyCode(file: PolicyFileRecord): Promise<void> {
        try {
            await navigator.clipboard.writeText(file.code);
            this.notifications.showSuccess(COPY_SUCCESS_MESSAGE);
        } catch {
            this.notifications.showError("Could not copy policy code");
        }
    }

    downloadPolicyFile(file: PolicyFileRecord): void {
        const blob = new Blob([file.code], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = file.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    async onUploadPolicyFile(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.item(0);

        if (!file) {
            return;
        }

        const code = await file.text();
        const created = this.policyStore.addUploadedPolicy(file.name, code);

        input.value = "";
        this.notifications.showSuccess(`Uploaded ${created.fileName}`);
        this.openPolicyFile(created.id);
    }

    resolvePendingLeave(allowLeave: boolean): void {
        const pending = this.pendingLeaveAction();

        this.pendingLeaveAction.set(null);
        pending?.resolve(allowLeave);
    }

    discardAndLeave(): void {
        const file = this.selectedFile();

        if (file) {
            this.draftCode.set(file.code);
        }

        this.isEditing.set(false);
        this.validationError.set(null);
        this.resolvePendingLeave(true);
    }

    saveAndLeave(): void {
        const saved = this.savePolicy();

        if (!saved) {
            this.resolvePendingLeave(false);

            return;
        }

        this.resolvePendingLeave(true);
    }

    statusBarBackgroundClass(): string {
        if (this.validationError()) {
            return "bg-error";
        }

        if (this.isEditing()) {
            return "bg-dark-primary";
        }

        return "bg-dark-surface-deep";
    }

    statusBarModeText(): string {
        if (this.validationError()) {
            return "Editing · 1 error";
        }

        if (this.isEditing()) {
            return "Editing";
        }

        return "Read-only";
    }
}
