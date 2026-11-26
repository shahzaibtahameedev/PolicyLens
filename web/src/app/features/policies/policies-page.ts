import type { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal, viewChild } from "@angular/core";
import { readApiFailure } from "../../core/api-errors";
import { ApiService } from "../../core/api.service";
import {
    COMPILE_REJECTED_NOTE,
    DISCARD_CHANGES_PROMPT,
    NO_POLICY_SELECTED_MESSAGE,
    REGO_LANGUAGE_ID,
    SAVE_SUCCESS_MESSAGE,
    VIOLATION_RULE_MARKER,
} from "../../core/constants";
import type { EditorMarker, OpaCompileError, PolicyFile, SaveFailure } from "../../core/models";
import { NotificationService } from "../../core/notification.service";
import { CodeEditor } from "../../shared/code-editor/code-editor";

const POLICY_ITEM_BASE_CLASSES = "mb-1 w-full rounded-lg px-3 py-2.5 text-left transition";

@Component({
    selector: "pl-policies-page",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CodeEditor],
    template: `
        <div class="flex h-full">
            <aside class="flex w-72 shrink-0 flex-col border-r border-edge bg-panel">
                <div class="flex items-center justify-between border-b border-edge px-4 py-3">
                    <h2 class="text-xs font-semibold tracking-wider text-ink-faint uppercase">Policies</h2>
                    <span class="text-xs text-ink-faint">{{ policies().length }}</span>
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto p-2">
                    @for (policy of policies(); track policy.id) {
                        <button
                            type="button"
                            (click)="selectPolicy(policy)"
                            [class]="policyItemClasses(policy)"
                        >
                            <span class="flex items-center gap-2">
                                <span class="truncate text-sm font-medium text-ink">{{ policy.id }}</span>
                                @if (policy.id === selectedPolicyId() && isDirty()) {
                                    <span
                                        class="size-1.5 shrink-0 rounded-full bg-medium"
                                        title="Unsaved changes"
                                    ></span>
                                }
                            </span>
                            <span class="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-ink-faint">
                                <span class="truncate">{{ policy.fileName }}</span>
                                <span class="shrink-0">· {{ ruleCount(policy) }} rules</span>
                            </span>
                        </button>
                    } @empty {
                        <p class="px-3 py-2 text-sm text-ink-faint">No .rego files in the policies folder.</p>
                    }
                </div>

                <p class="border-t border-edge px-4 py-3 font-mono text-[11px] leading-relaxed text-ink-faint">
                    All modules share <span class="text-ink-dim">package azure.audit</span>, so OPA compiles them
                    together.
                </p>
            </aside>

            <section class="flex min-w-0 flex-1 flex-col">
                @if (selectedPolicy(); as policy) {
                    <div class="flex shrink-0 items-center gap-3 border-b border-edge bg-panel px-5 py-2.5">
                        <div class="min-w-0">
                            <h1 class="truncate text-sm font-semibold text-ink">{{ policy.id }}</h1>
                            <p class="truncate font-mono text-[11px] text-ink-faint">policies/{{ policy.fileName }}</p>
                        </div>

                        @if (isDirty()) {
                            <span class="rounded bg-medium/15 px-2 py-0.5 text-[11px] font-medium text-medium">
                                Unsaved
                            </span>
                        }

                        <div class="ml-auto flex items-center gap-2">
                            @if (isEditing()) {
                                <button
                                    type="button"
                                    (click)="revertChanges()"
                                    class="rounded-md border border-edge-strong px-3 py-1.5 text-xs font-medium text-ink-dim transition hover:text-ink"
                                >
                                    Revert
                                </button>
                                <button
                                    type="button"
                                    (click)="savePolicy()"
                                    [disabled]="isSaving() || !isDirty()"
                                    class="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                                >
                                    {{ isSaving() ? "Validating..." : "Save" }}
                                </button>
                            } @else {
                                <button
                                    type="button"
                                    (click)="startEditing()"
                                    class="rounded-md border border-edge-strong px-3 py-1.5 text-xs font-medium text-ink-dim transition hover:border-accent hover:text-ink"
                                >
                                    Edit
                                </button>
                            }
                        </div>
                    </div>

                    <div class="min-h-0 flex-1">
                        <pl-code-editor
                            [(value)]="draftText"
                            [language]="regoLanguageId"
                            [readOnly]="!isEditing()"
                            [markers]="editorMarkers()"
                        />
                    </div>

                    @if (saveFailure(); as failure) {
                        <div class="max-h-64 shrink-0 overflow-y-auto border-t border-high/30 bg-high/5">
                            <div class="flex items-start gap-3 px-5 py-3">
                                <span class="mt-1 size-2 shrink-0 rounded-full bg-high"></span>
                                <div class="min-w-0">
                                    <p class="text-sm font-medium text-high">{{ failure.message }}</p>
                                    <p class="mt-1 text-xs text-ink-dim">{{ compileRejectedNote }}</p>
                                </div>
                                <button
                                    type="button"
                                    (click)="dismissFailure()"
                                    class="ml-auto shrink-0 text-xs text-ink-faint transition hover:text-ink"
                                >
                                    Dismiss
                                </button>
                            </div>

                            @if (failure.compileErrors.length) {
                                <ul class="border-t border-high/20 px-3 py-2">
                                    @for (compileError of failure.compileErrors; track $index) {
                                        <li>
                                            <button
                                                type="button"
                                                (click)="jumpToError(compileError)"
                                                class="w-full rounded px-2 py-1.5 text-left font-mono text-xs transition hover:bg-high/10"
                                            >
                                                <span class="text-high">{{ formatErrorLocation(compileError) }}</span>
                                                <span class="text-ink-dim">{{ compileError.message }}</span>
                                                <span class="text-ink-faint">({{ compileError.code }})</span>
                                            </button>
                                        </li>
                                    }
                                </ul>
                            }
                        </div>
                    }
                } @else {
                    <div class="grid h-full place-items-center text-sm text-ink-faint">
                        {{ noPolicySelectedMessage }}
                    </div>
                }
            </section>
        </div>
    `,
})
export class PoliciesPage {
    private readonly api = inject(ApiService);
    private readonly notifications = inject(NotificationService);
    private readonly editor = viewChild(CodeEditor);

    readonly regoLanguageId = REGO_LANGUAGE_ID;
    readonly compileRejectedNote = COMPILE_REJECTED_NOTE;
    readonly noPolicySelectedMessage = NO_POLICY_SELECTED_MESSAGE;

    readonly policies = signal<PolicyFile[]>([]);
    readonly selectedPolicyId = signal<string>("");
    readonly draftText = signal<string>("");
    readonly isEditing = signal(false);
    readonly isSaving = signal(false);
    readonly saveFailure = signal<SaveFailure | null>(null);

    readonly selectedPolicy = computed(() => {
        const policyId = this.selectedPolicyId();
        const selected = this.policies().find((policy) => policy.id === policyId);

        return selected;
    });

    readonly isDirty = computed(() => {
        const policy = this.selectedPolicy();

        if (!policy) {
            return false;
        }

        const hasChanges = policy.text !== this.draftText();

        return hasChanges;
    });

    readonly editorMarkers = computed<EditorMarker[]>(() => {
        const failure = this.saveFailure();

        if (!failure) {
            return [];
        }

        const markers: EditorMarker[] = [];

        for (const compileError of failure.compileErrors) {
            const location = compileError.location;

            if (location) {
                markers.push({ row: location.row, col: location.col, message: compileError.message });
            }
        }

        return markers;
    });

    constructor() {
        this.loadPolicies();
    }

    @HostListener("document:keydown", ["$event"])
    handleKeydown(event: KeyboardEvent): void {
        const isSaveShortcut = event.key === "s" && (event.ctrlKey || event.metaKey);

        if (!isSaveShortcut) {
            return;
        }

        const canSave = this.isEditing() && this.isDirty() && !this.isSaving();

        if (!canSave) {
            return;
        }

        event.preventDefault();
        this.savePolicy();
    }

    policyItemClasses(policy: PolicyFile): string {
        const isSelected = policy.id === this.selectedPolicyId();

        if (isSelected) {
            return `${POLICY_ITEM_BASE_CLASSES} bg-raised ring-1 ring-edge-strong`;
        }

        return `${POLICY_ITEM_BASE_CLASSES} hover:bg-raised/60`;
    }

    ruleCount(policy: PolicyFile): number {
        const ruleSegments = policy.text.split(VIOLATION_RULE_MARKER);
        const count = ruleSegments.length - 1;

        return count;
    }

    formatErrorLocation(compileError: OpaCompileError): string {
        const location = compileError.location;

        if (!location) {
            return "unknown line ";
        }

        return `line ${location.row}:${location.col} `;
    }

    selectPolicy(policy: PolicyFile): void {
        const isAlreadySelected = policy.id === this.selectedPolicyId();

        if (isAlreadySelected) {
            return;
        }

        const needsConfirmation = this.isDirty();

        if (needsConfirmation) {
            const shouldDiscard = window.confirm(DISCARD_CHANGES_PROMPT);

            if (!shouldDiscard) {
                return;
            }
        }

        this.selectedPolicyId.set(policy.id);
        this.draftText.set(policy.text);
        this.isEditing.set(false);
        this.saveFailure.set(null);
    }

    startEditing(): void {
        this.isEditing.set(true);
    }

    revertChanges(): void {
        const policy = this.selectedPolicy();

        if (!policy) {
            return;
        }

        this.draftText.set(policy.text);
        this.isEditing.set(false);
        this.saveFailure.set(null);
    }

    dismissFailure(): void {
        this.saveFailure.set(null);
    }

    jumpToError(compileError: OpaCompileError): void {
        const location = compileError.location;

        if (!location) {
            return;
        }

        this.editor()?.revealPosition(location.row, location.col);
    }

    savePolicy(): void {
        const policy = this.selectedPolicy();

        if (!policy) {
            return;
        }

        const regoText = this.draftText();

        this.isSaving.set(true);
        this.saveFailure.set(null);

        this.api.savePolicy(policy.id, regoText).subscribe({
            next: () => {
                this.isSaving.set(false);
                this.isEditing.set(false);
                this.applySavedText(policy.id, regoText);
                this.notifications.showSuccess(SAVE_SUCCESS_MESSAGE);
            },
            error: (errorResponse: HttpErrorResponse) => {
                const failure = readApiFailure(errorResponse);

                this.isSaving.set(false);
                this.saveFailure.set(failure);
            },
        });
    }

    private applySavedText(policyId: string, regoText: string): void {
        this.policies.update((policies) =>
            policies.map((policy) => {
                const isSavedPolicy = policy.id === policyId;

                if (!isSavedPolicy) {
                    return policy;
                }

                return { id: policy.id, fileName: policy.fileName, text: regoText };
            }),
        );
    }

    private loadPolicies(): void {
        this.api.getPolicies().subscribe({
            next: (policies) => {
                this.policies.set(policies);

                const firstPolicy = policies[0];

                if (firstPolicy) {
                    this.selectedPolicyId.set(firstPolicy.id);
                    this.draftText.set(firstPolicy.text);
                }
            },
            error: (errorResponse: HttpErrorResponse) => {
                const failure = readApiFailure(errorResponse);

                this.notifications.showError(failure.message);
            },
        });
    }
}
