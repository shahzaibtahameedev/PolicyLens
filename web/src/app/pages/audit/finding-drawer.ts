import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import type { AiDecision, AuditFinding } from "../../core/models";
import { SeverityBadge } from "../../shared/severity-badge/severity-badge";

@Component({
    selector: "pl-finding-drawer",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SeverityBadge],
    template: `
        <div class="fixed inset-0 z-40 flex justify-end bg-black/25" (click)="closeDrawer.emit()">
            <section
                class="flex h-full w-full max-w-[620px] flex-col bg-surface shadow-pane"
                (click)="$event.stopPropagation()"
                role="dialog"
                aria-modal="true"
                aria-label="Finding details"
            >
                <div class="flex shrink-0 flex-col gap-2.5 border-b border-hairline px-7 py-5">
                    <div class="flex items-center gap-2.5">
                        <pl-severity-badge [severity]="finding().severity" />

                        @if (finding().isAiJudgmentCall) {
                            <span
                                class="inline-flex h-6 items-center gap-1.5 rounded-xs border border-primary-tint-strong bg-primary-tint px-2.5 text-[13px]"
                            >
                                <span class="size-2 rotate-45 border-[1.5px] border-primary"></span>
                                <span>
                                    AI judgment call ·
                                    <b class="font-semibold">{{ finding().aiConfidencePercent }}%</b>
                                </span>
                            </span>
                        }

                        <span class="ml-auto text-[13px] text-muted">
                            Finding {{ currentIndex() + 1 }} of {{ totalCount() }}
                        </span>

                        <button
                            type="button"
                            (click)="closeDrawer.emit()"
                            aria-label="Close finding details"
                            class="flex size-9 cursor-pointer items-center justify-center rounded-xs text-lg text-body hover:bg-surface-hover"
                        >
                            ✕
                        </button>
                    </div>

                    <h2 class="text-[22px] font-semibold leading-7 text-pretty text-ink">
                        {{ finding().policyTitle }}
                    </h2>

                    <div class="text-[13px] leading-[18px] text-muted">
                        Policy {{ finding().policyId }} ·
                        <span class="text-link">{{ finding().resourceName }}</span>
                        · {{ finding().resourceType }} · {{ finding().resourceGroup }}
                    </div>
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto px-7 py-6">
                    <div class="flex flex-col gap-6">
                        @if (finding().isAiJudgmentCall) {
                            <div
                                class="flex flex-col gap-2.5 rounded border border-primary-tint-strong bg-primary-tint px-5 py-4"
                            >
                                <div class="flex items-baseline justify-between">
                                    <span class="text-sm font-semibold text-ink">AI judgment call</span>
                                    <span class="text-[13px] text-body">
                                        <b class="font-semibold text-ink">{{ finding().aiConfidencePercent }}%</b>
                                        confidence
                                    </span>
                                </div>

                                <div class="h-1.5 overflow-hidden rounded-xs bg-primary-tint-strong">
                                    <div
                                        class="h-full bg-primary"
                                        [style.width.%]="finding().aiConfidencePercent ?? 0"
                                    ></div>
                                </div>

                                <p class="text-sm leading-5 text-pretty text-ink">
                                    {{ finding().aiNote }}
                                </p>

                                <div class="mt-1 flex items-center gap-2.5">
                                    <button
                                        type="button"
                                        (click)="decideAi.emit('accepted')"
                                        [class]="acceptButtonClasses()"
                                    >
                                        Accept as compliant
                                    </button>
                                    <button
                                        type="button"
                                        (click)="decideAi.emit('kept')"
                                        [class]="keepButtonClasses()"
                                    >
                                        Keep as finding
                                    </button>
                                </div>
                            </div>
                        }

                        <div class="flex flex-col gap-1.5">
                            <h3 class="text-[15px] font-semibold text-ink">Explanation</h3>
                            <p class="text-[15px] leading-[22px] text-pretty text-ink">
                                {{ finding().explanation }}
                            </p>
                        </div>

                        <div class="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
                            <span class="text-muted">Field checked</span>
                            <code class="font-mono text-ink">{{ finding().fieldChecked }}</code>
                            <span class="text-muted">Rule</span>
                            <span class="text-ink">{{ finding().ruleDescription }}</span>
                        </div>

                        <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                            <div class="flex flex-col gap-1.5">
                                <span class="flex items-center gap-1.5 text-[13px] text-error-text">
                                    <span class="text-[11px]">✕</span>
                                    <span>Actual value</span>
                                </span>
                                <pre
                                    class="overflow-x-auto rounded border border-error-border bg-error-tint px-3 py-2.5 font-mono text-[13px] leading-5 text-ink"
                                >{{ finding().actualJson }}</pre>
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <span class="flex items-center gap-1.5 text-[13px] text-success">
                                    <span class="text-[11px]">✓</span>
                                    <span>Expected value</span>
                                </span>
                                <pre
                                    class="overflow-x-auto rounded border border-success-border bg-success-tint px-3 py-2.5 font-mono text-[13px] leading-5 text-ink"
                                >{{ finding().expectedJson }}</pre>
                            </div>
                        </div>

                        <div class="flex flex-col gap-2">
                            <h3 class="text-[15px] font-semibold text-ink">Recommended fix</h3>
                            <p class="text-sm text-ink">{{ finding().fixSummary }}</p>
                            <div
                                class="relative rounded bg-surface-soft py-2.5 pr-16 pl-3 font-mono text-[13px] leading-5 break-all text-ink"
                            >
                                <span>{{ finding().fixCommand }}</span>
                                <button
                                    type="button"
                                    (click)="copyFix.emit(finding().fixCommand)"
                                    class="absolute top-2.5 right-3 cursor-pointer font-sans text-[13px] font-semibold text-link hover:text-link-hover"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div class="flex flex-col gap-2 border-t border-hairline pt-4">
                            <h3 class="text-[15px] font-semibold text-ink">Source</h3>
                            <div class="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
                                <span class="text-muted">Policy</span>
                                <span>{{ finding().policyId }} · {{ finding().policyTitle }}</span>
                                <span class="text-muted">Rego file</span>
                                <button
                                    type="button"
                                    (click)="openPolicy.emit(finding())"
                                    class="w-fit cursor-pointer text-left font-mono text-[13px] text-link hover:text-link-hover"
                                >
                                    {{ finding().regoFilePath }} · lines {{ finding().regoLineStart }}–{{
                                        finding().regoLineEnd
                                    }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex h-16 shrink-0 items-center gap-2.5 border-t border-hairline px-7">
                    <button
                        type="button"
                        (click)="previousFinding.emit()"
                        [disabled]="!hasPrevious()"
                        class="h-9 cursor-pointer rounded-xs border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-hover disabled:cursor-default disabled:border-transparent disabled:bg-surface-disabled disabled:text-disabled-text"
                    >
                        ‹ Previous
                    </button>

                    <button
                        type="button"
                        (click)="nextFinding.emit()"
                        [disabled]="!hasNext()"
                        class="h-9 cursor-pointer rounded-xs border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-hover disabled:cursor-default disabled:border-transparent disabled:bg-surface-disabled disabled:text-disabled-text"
                    >
                        Next ›
                    </button>

                    <button
                        type="button"
                        (click)="openPolicy.emit(finding())"
                        class="ml-auto h-9 cursor-pointer rounded-xs border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-hover"
                    >
                        Open in Policies
                    </button>
                </div>
            </section>
        </div>
    `,
})
export class FindingDrawer {
    readonly finding = input.required<AuditFinding>();
    readonly currentIndex = input.required<number>();
    readonly totalCount = input.required<number>();

    readonly closeDrawer = output<void>();
    readonly previousFinding = output<void>();
    readonly nextFinding = output<void>();
    readonly decideAi = output<Exclude<AiDecision, "pending">>();
    readonly copyFix = output<string>();
    readonly openPolicy = output<AuditFinding>();

    readonly hasPrevious = computed(() => {
        const index = this.currentIndex();

        return index > 0;
    });

    readonly hasNext = computed(() => {
        const index = this.currentIndex();
        const total = this.totalCount();

        return index < total - 1;
    });

    acceptButtonClasses(): string {
        const isAccepted = this.finding().aiDecision === "accepted";

        if (isAccepted) {
            return "h-8 cursor-pointer rounded-xs border border-primary bg-primary px-3.5 text-[13px] font-semibold text-on-primary";
        }

        return "h-8 cursor-pointer rounded-xs border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink hover:bg-surface-hover";
    }

    keepButtonClasses(): string {
        const isKept = this.finding().aiDecision === "kept";

        if (isKept) {
            return "h-8 cursor-pointer rounded-xs border border-ink bg-ink px-3.5 text-[13px] font-semibold text-on-primary";
        }

        return "h-8 cursor-pointer rounded-xs border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink hover:bg-surface-hover";
    }
}
