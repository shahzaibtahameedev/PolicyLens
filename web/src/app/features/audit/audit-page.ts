import type { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { readApiFailure } from "../../core/api-errors";
import { ApiService } from "../../core/api.service";
import {
    COMPLIANT_MESSAGE,
    FALLBACK_BADGE_CLASSES,
    FALLBACK_BAR_CLASSES,
    JSON_INDENT,
    JSON_LANGUAGE_ID,
    NO_RESOURCE_SELECTED_MESSAGE,
    SEVERITY_BADGE_CLASSES,
    SEVERITY_BAR_CLASSES,
    SEVERITY_ORDER,
    UNRANKED_SEVERITY_ORDER,
} from "../../core/constants";
import type { AuditResult, ResourceSummary, Violation } from "../../core/models";
import { NotificationService } from "../../core/notification.service";
import { CodeEditor } from "../../shared/code-editor/code-editor";

const RESOURCE_ITEM_BASE_CLASSES = "mb-1 w-full rounded-lg px-3 py-2.5 text-left transition";
const BADGE_BASE_CLASSES = "rounded px-2 py-0.5 text-[11px] font-semibold ring-1";

@Component({
    selector: "pl-audit-page",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CodeEditor],
    template: `
        <div class="flex h-full">
            <aside class="flex w-72 shrink-0 flex-col border-r border-edge bg-panel">
                <div class="flex items-center justify-between border-b border-edge px-4 py-3">
                    <h2 class="text-xs font-semibold tracking-wider text-ink-faint uppercase">Azure resources</h2>
                    <span class="text-xs text-ink-faint">{{ resources().length }}</span>
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto p-2">
                    @for (resource of resources(); track resource.id) {
                        <button type="button" (click)="selectResource(resource)" [class]="resourceItemClasses(resource)">
                            <span class="truncate text-sm font-medium text-ink">{{ resource.id }}</span>
                            <span class="mt-0.5 block truncate font-mono text-[11px] text-ink-faint">
                                {{ resource.name }}
                            </span>
                            <span class="mt-1.5 flex flex-wrap gap-1">
                                <span class="rounded bg-canvas px-1.5 py-0.5 text-[10px] text-ink-dim">
                                    {{ shortResourceType(resource) }}
                                </span>
                                <span class="rounded bg-canvas px-1.5 py-0.5 text-[10px] text-ink-dim">
                                    {{ resource.location }}
                                </span>
                                <span class="rounded bg-canvas px-1.5 py-0.5 text-[10px] text-ink-faint">
                                    {{ tagCount(resource) }} tags
                                </span>
                            </span>
                        </button>
                    } @empty {
                        <p class="px-3 py-2 text-sm text-ink-faint">No .json files in the resources folder.</p>
                    }
                </div>

                <p class="border-t border-edge px-4 py-3 font-mono text-[11px] leading-relaxed text-ink-faint">
                    Each file in <span class="text-ink-dim">resources/</span> is one resource, named after the file.
                </p>
            </aside>

            <section class="flex min-w-0 flex-1 flex-col">
                @if (selectedResource(); as resource) {
                    <div class="flex shrink-0 items-center gap-3 border-b border-edge bg-panel px-5 py-2.5">
                        <div class="min-w-0">
                            <h1 class="truncate text-sm font-semibold text-ink">{{ resource.name }}</h1>
                            <p class="truncate font-mono text-[11px] text-ink-faint">
                                resources/{{ resource.fileName }} · {{ resource.type }}
                            </p>
                        </div>

                        <button
                            type="button"
                            (click)="runAudit()"
                            [disabled]="isRunning()"
                            class="ml-auto rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                        >
                            {{ isRunning() ? "Running..." : "Run audit" }}
                        </button>
                    </div>

                    <div class="flex min-h-0 flex-1">
                        <div class="min-w-0 flex-1">
                            <pl-code-editor
                                [value]="resourceJson()"
                                [language]="jsonLanguageId"
                                [readOnly]="true"
                            />
                        </div>

                        <div class="flex w-[28rem] shrink-0 flex-col overflow-y-auto border-l border-edge bg-panel">
                            @if (auditResult(); as result) {
                                <div class="shrink-0 border-b border-edge px-5 py-4">
                                    <div class="flex items-center gap-2">
                                        @if (result.isCompliant) {
                                            <span class="rounded bg-pass/15 px-2 py-0.5 text-xs font-semibold text-pass ring-1 ring-pass/30">
                                                Compliant
                                            </span>
                                        } @else {
                                            <span class="rounded bg-high/15 px-2 py-0.5 text-xs font-semibold text-high ring-1 ring-high/30">
                                                {{ result.violations.length }} violations
                                            </span>
                                        }
                                        <span class="ml-auto font-mono text-[11px] text-ink-faint">
                                            {{ formatEvaluationMs(result) }} · {{ formatEvaluatedAt(result) }}
                                        </span>
                                    </div>

                                    <div class="mt-3 flex gap-2">
                                        @for (severity of severityOrder; track severity) {
                                            <span class="flex-1 rounded-md bg-canvas px-2 py-1.5 text-center">
                                                <span class="block text-sm font-semibold text-ink">
                                                    {{ severityCount(severity) }}
                                                </span>
                                                <span class="block text-[10px] tracking-wide text-ink-faint uppercase">
                                                    {{ severity }}
                                                </span>
                                            </span>
                                        }
                                    </div>
                                </div>

                                @if (result.isCompliant) {
                                    <div class="grid flex-1 place-items-center px-8 py-10 text-center">
                                        <div>
                                            <span class="mx-auto block size-10 rounded-full bg-pass/15"></span>
                                            <p class="mt-3 text-sm text-ink-dim">{{ compliantMessage }}</p>
                                        </div>
                                    </div>
                                } @else {
                                    <ul class="divide-y divide-edge">
                                        @for (violation of sortedViolations(); track $index) {
                                            <li class="flex gap-0">
                                                <span [class]="severityBarClasses(violation)"></span>
                                                <div class="min-w-0 flex-1 px-4 py-3">
                                                    <div class="flex items-center gap-2">
                                                        <span class="rounded bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-ink-dim">
                                                            {{ violation.policy_id }}
                                                        </span>
                                                        <span [class]="severityBadgeClasses(violation)">
                                                            {{ violation.severity }}
                                                        </span>
                                                    </div>

                                                    <p class="mt-1.5 text-sm text-ink">{{ violation.message }}</p>

                                                    <p class="mt-1 truncate font-mono text-[11px] text-ink-faint">
                                                        {{ violation.field }}
                                                    </p>

                                                    <details class="mt-2 group">
                                                        <summary class="cursor-pointer text-[11px] text-ink-faint transition hover:text-ink-dim">
                                                            Actual value
                                                        </summary>
                                                        <pre class="mt-1.5 overflow-x-auto rounded-md bg-canvas p-2.5 font-mono text-[11px] leading-relaxed text-ink-dim">{{ formatActual(violation) }}</pre>
                                                    </details>
                                                </div>
                                            </li>
                                        }
                                    </ul>
                                }
                            } @else {
                                <div class="grid flex-1 place-items-center px-8 text-center text-sm text-ink-faint">
                                    @if (auditErrorMessage()) {
                                        <p class="text-high">{{ auditErrorMessage() }}</p>
                                    } @else {
                                        <p>Run the audit to evaluate this resource against every installed policy.</p>
                                    }
                                </div>
                            }
                        </div>
                    </div>
                } @else {
                    <div class="grid h-full place-items-center text-sm text-ink-faint">
                        {{ noResourceSelectedMessage }}
                    </div>
                }
            </section>
        </div>
    `,
})
export class AuditPage {
    private readonly api = inject(ApiService);
    private readonly notifications = inject(NotificationService);

    readonly jsonLanguageId = JSON_LANGUAGE_ID;
    readonly severityOrder = SEVERITY_ORDER;
    readonly compliantMessage = COMPLIANT_MESSAGE;
    readonly noResourceSelectedMessage = NO_RESOURCE_SELECTED_MESSAGE;

    readonly resources = signal<ResourceSummary[]>([]);
    readonly selectedResourceId = signal<string>("");
    readonly resourceJson = signal<string>("");
    readonly auditResult = signal<AuditResult | null>(null);
    readonly auditErrorMessage = signal<string>("");
    readonly isRunning = signal(false);

    readonly selectedResource = computed(() => {
        const resourceId = this.selectedResourceId();
        const selected = this.resources().find((resource) => resource.id === resourceId);

        return selected;
    });

    readonly sortedViolations = computed(() => {
        const result = this.auditResult();

        if (!result) {
            return [];
        }

        const violations = result.violations.slice();

        violations.sort((first, second) => {
            const firstRank = this.severityRank(first.severity);
            const secondRank = this.severityRank(second.severity);

            if (firstRank !== secondRank) {
                return firstRank - secondRank;
            }

            return first.policy_id.localeCompare(second.policy_id);
        });

        return violations;
    });

    constructor() {
        this.loadResources();
    }

    resourceItemClasses(resource: ResourceSummary): string {
        const isSelected = resource.id === this.selectedResourceId();

        if (isSelected) {
            return `${RESOURCE_ITEM_BASE_CLASSES} bg-raised ring-1 ring-edge-strong`;
        }

        return `${RESOURCE_ITEM_BASE_CLASSES} hover:bg-raised/60`;
    }

    severityBadgeClasses(violation: Violation): string {
        const severityClasses = SEVERITY_BADGE_CLASSES[violation.severity];
        const resolvedClasses = severityClasses ? severityClasses : FALLBACK_BADGE_CLASSES;

        return `${BADGE_BASE_CLASSES} ${resolvedClasses}`;
    }

    severityBarClasses(violation: Violation): string {
        const barClasses = SEVERITY_BAR_CLASSES[violation.severity];
        const resolvedClasses = barClasses ? barClasses : FALLBACK_BAR_CLASSES;

        return `w-1 shrink-0 ${resolvedClasses}`;
    }

    severityCount(severity: string): number {
        const result = this.auditResult();

        if (!result) {
            return 0;
        }

        const matching = result.violations.filter((violation) => violation.severity === severity);

        return matching.length;
    }

    shortResourceType(resource: ResourceSummary): string {
        const typeSegments = resource.type.split("/");
        const lastSegment = typeSegments[typeSegments.length - 1];

        return lastSegment ? lastSegment : resource.type;
    }

    tagCount(resource: ResourceSummary): number {
        const tagNames = Object.keys(resource.tags);

        return tagNames.length;
    }

    formatActual(violation: Violation): string {
        const actualJson = JSON.stringify(violation.actual, null, JSON_INDENT);

        return actualJson;
    }

    formatEvaluationMs(result: AuditResult): string {
        const rounded = result.evaluationMs.toFixed(2);

        return `${rounded} ms`;
    }

    formatEvaluatedAt(result: AuditResult): string {
        const evaluatedAt = new Date(result.evaluatedAt);
        const formatted = evaluatedAt.toLocaleTimeString();

        return formatted;
    }

    selectResource(resource: ResourceSummary): void {
        const isAlreadySelected = resource.id === this.selectedResourceId();

        if (isAlreadySelected) {
            return;
        }

        this.selectedResourceId.set(resource.id);
        this.auditResult.set(null);
        this.auditErrorMessage.set("");
        this.loadResourceJson(resource.id);
    }

    runAudit(): void {
        const resource = this.selectedResource();

        if (!resource) {
            return;
        }

        this.isRunning.set(true);
        this.auditErrorMessage.set("");

        this.api.runAudit(resource.id).subscribe({
            next: (result) => {
                this.isRunning.set(false);
                this.auditResult.set(result);
            },
            error: (errorResponse: HttpErrorResponse) => {
                const failure = readApiFailure(errorResponse);

                this.isRunning.set(false);
                this.auditResult.set(null);
                this.auditErrorMessage.set(failure.message);
            },
        });
    }

    private severityRank(severity: string): number {
        const rank = SEVERITY_ORDER.indexOf(severity);

        if (rank < 0) {
            return UNRANKED_SEVERITY_ORDER;
        }

        return rank;
    }

    private loadResourceJson(resourceId: string): void {
        this.api.getResource(resourceId).subscribe({
            next: (resource) => {
                const resourceJson = JSON.stringify(resource, null, JSON_INDENT);

                this.resourceJson.set(resourceJson);
            },
            error: (errorResponse: HttpErrorResponse) => {
                const failure = readApiFailure(errorResponse);

                this.notifications.showError(failure.message);
            },
        });
    }

    private loadResources(): void {
        this.api.getResources().subscribe({
            next: (resources) => {
                this.resources.set(resources);

                const firstResource = resources[0];

                if (firstResource) {
                    this.selectedResourceId.set(firstResource.id);
                    this.loadResourceJson(firstResource.id);
                }
            },
            error: (errorResponse: HttpErrorResponse) => {
                const failure = readApiFailure(errorResponse);

                this.notifications.showError(failure.message);
            },
        });
    }
}
