import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";
import type { AuditFinding, PdfResourceSummaryRow } from "../../core/models";

@Component({
    selector: "pl-pdf-preview-modal",
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" (click)="closeModal.emit()">
            <section
                class="flex h-[820px] max-h-[calc(100vh-48px)] w-[1160px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-lg bg-surface shadow-pane"
                (click)="$event.stopPropagation()"
                role="dialog"
                aria-modal="true"
                aria-label="Export PDF preview"
            >
                <div class="flex h-[72px] shrink-0 items-center justify-between border-b border-hairline px-7 py-3.5">
                    <div>
                        <h2 class="text-2xl font-semibold leading-8 text-ink">Export PDF</h2>
                        <p class="text-[13px] leading-[18px] text-muted">
                            Preview · policylens-storage-audit-2026-11-26.pdf · 3 pages · A4
                        </p>
                    </div>
                    <button
                        type="button"
                        (click)="closeModal.emit()"
                        aria-label="Close PDF preview"
                        class="flex size-9 cursor-pointer items-center justify-center rounded-xs text-lg text-body hover:bg-surface-hover"
                    >
                        ✕
                    </button>
                </div>

                <div
                    class="flex min-h-0 flex-1 items-center justify-center gap-7 overflow-auto bg-surface-disabled p-7"
                >
                    <article
                        class="flex h-[610px] w-[440px] shrink-0 flex-col bg-surface p-9 text-[11px] leading-[15px] text-ink shadow-tile"
                    >
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="flex size-4 items-center justify-center rounded-xs bg-primary">
                                    <span class="size-1.5 rounded-full border-[1.5px] border-white"></span>
                                </span>
                                <span class="text-xs font-semibold">PolicyLens</span>
                            </div>
                            <span class="text-muted">Nov 26, 2026</span>
                        </div>

                        <div class="mt-10 text-xs text-muted">Compliance audit report</div>
                        <div class="mt-1 text-2xl font-semibold leading-8">
                            {{ resourceTypeName() }} audit
                        </div>
                        <div class="mt-1.5 text-muted">
                            Run Nov 26, 2026 at 09:42 · Source: {{ sourceLabel() }} · Prepared by Maya Kessler
                        </div>

                        <div class="mt-6 grid grid-cols-[1.2fr_1fr_1fr_1fr] rounded-xs border border-hairline">
                            <div class="p-3">
                                <div class="text-muted">Compliant</div>
                                <div class="font-metric text-[22px] font-semibold leading-7">1 of 4</div>
                            </div>
                            <div class="border-l border-hairline p-3">
                                <div class="text-error-text">◆ High</div>
                                <div class="font-metric text-[22px] font-semibold leading-7">{{ highCount() }}</div>
                            </div>
                            <div class="border-l border-hairline p-3">
                                <div class="text-warning-text">▲ Medium</div>
                                <div class="font-metric text-[22px] font-semibold leading-7">{{ mediumCount() }}</div>
                            </div>
                            <div class="border-l border-hairline p-3">
                                <div class="text-body">● Low</div>
                                <div class="font-metric text-[22px] font-semibold leading-7">{{ lowCount() }}</div>
                            </div>
                        </div>

                        <div class="mt-5 text-xs font-semibold">Resources</div>
                        <div class="mt-1.5 grid grid-cols-[1fr_36px_36px_36px_92px]">
                            <span class="border-b border-border py-1.5 font-semibold">Resource</span>
                            <span class="border-b border-border py-1.5 font-semibold">High</span>
                            <span class="border-b border-border py-1.5 font-semibold">Med</span>
                            <span class="border-b border-border py-1.5 font-semibold">Low</span>
                            <span class="border-b border-border py-1.5 font-semibold">Status</span>

                            @for (row of resourceRows(); track row.name) {
                                <span class="border-b border-hairline py-1.5">{{ row.name }}</span>
                                <span class="border-b border-hairline py-1.5">{{ row.high }}</span>
                                <span class="border-b border-hairline py-1.5">{{ row.medium }}</span>
                                <span class="border-b border-hairline py-1.5">{{ row.low }}</span>
                                <span
                                    class="border-b border-hairline py-1.5"
                                    [class]="row.isCompliant ? 'text-success' : 'text-error-text'"
                                >
                                    {{ row.isCompliant ? "Compliant" : "Non-compliant" }}
                                </span>
                            }
                        </div>

                        <div class="mt-5 text-xs font-semibold">Policies evaluated</div>
                        <p class="mt-1 text-body">
                            storage.rego (6 rules), tagging.rego (1 rule) · OPA at localhost:8181
                            @if (includeAiJudgmentCalls()) {
                                · Includes 1 AI judgment call (72% confidence), marked in findings.
                            }
                            @if (includeRecommendedFixes()) {
                                · Includes CLI remediation steps.
                            }
                        </p>

                        <div class="mt-auto flex justify-between border-t border-hairline pt-2.5 text-muted">
                            <span>PolicyLens · {{ resourceTypeName() }} audit</span>
                            <span>1 / 3</span>
                        </div>
                    </article>

                    <article
                        class="flex h-[610px] w-[440px] shrink-0 flex-col bg-surface p-9 text-[11px] leading-[15px] text-ink shadow-tile"
                    >
                        <div class="text-base font-semibold leading-5">Findings by severity</div>

                        <div
                            class="mt-3.5 flex items-center gap-1.5 border-b border-error pb-1 text-xs font-semibold text-error-text"
                        >
                            <span class="size-1.5 rotate-45 bg-error"></span>
                            <span>High · {{ highFindings().length }}</span>
                        </div>

                        @for (item of highFindings().slice(0, 6); track item.id) {
                            <div class="border-b border-hairline py-1.5">
                                <div class="font-semibold">
                                    <span class="font-mono text-muted">{{ item.policyId }}</span>
                                    {{ item.policyTitle }}
                                </div>
                                <div class="text-body">{{ item.resourceName }} — {{ item.reason }}</div>
                            </div>
                        }

                        <div
                            class="mt-3.5 flex items-center gap-1.5 border-b border-warning pb-1 text-xs font-semibold text-warning-text"
                        >
                            <span
                                class="h-0 w-0 border-x-4 border-b-[7px] border-x-transparent border-b-warning"
                            ></span>
                            <span>Medium · {{ mediumFindings().length }}</span>
                        </div>

                        @for (item of mediumFindings().slice(0, 2); track item.id) {
                            <div class="border-b border-hairline py-1.5">
                                <div class="font-semibold">
                                    <span class="font-mono text-muted">{{ item.policyId }}</span>
                                    {{ item.policyTitle }}
                                </div>
                                <div class="text-body">{{ item.resourceName }} — {{ item.reason }}</div>
                            </div>
                        }

                        <div class="mt-auto flex justify-between border-t border-hairline pt-2.5 text-muted">
                            <span>PolicyLens · {{ resourceTypeName() }} audit</span>
                            <span>2 / 3</span>
                        </div>
                    </article>
                </div>

                <div class="flex h-[72px] shrink-0 items-center gap-6 border-t border-hairline px-7 py-4 text-sm">
                    <label class="flex cursor-pointer items-center gap-2.5 select-none">
                        <input
                            type="checkbox"
                            class="sr-only"
                            [checked]="includeAiJudgmentCalls()"
                            (change)="toggleAiOption()"
                        />
                        <span
                            class="flex size-[18px] items-center justify-center rounded-xs text-xs"
                            [class]="
                                includeAiJudgmentCalls()
                                    ? 'bg-primary text-on-primary'
                                    : 'border border-border-accessible bg-surface text-transparent'
                            "
                        >
                            ✓
                        </span>
                        <span>Include AI judgment calls</span>
                    </label>

                    <label class="flex cursor-pointer items-center gap-2.5 select-none">
                        <input
                            type="checkbox"
                            class="sr-only"
                            [checked]="includeRecommendedFixes()"
                            (change)="toggleFixesOption()"
                        />
                        <span
                            class="flex size-[18px] items-center justify-center rounded-xs text-xs"
                            [class]="
                                includeRecommendedFixes()
                                    ? 'bg-primary text-on-primary'
                                    : 'border border-border-accessible bg-surface text-transparent'
                            "
                        >
                            ✓
                        </span>
                        <span>Include recommended fixes</span>
                    </label>

                    <div class="ml-auto flex gap-2.5">
                        <button
                            type="button"
                            (click)="closeModal.emit()"
                            class="h-9 cursor-pointer rounded-xs border border-border bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-hover"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            (click)="downloadPdf.emit()"
                            class="h-9 cursor-pointer rounded-xs bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
                        >
                            ↓ Download PDF
                        </button>
                    </div>
                </div>
            </section>
        </div>
    `,
})
export class PdfPreviewModal {
    readonly resourceTypeName = input.required<string>();
    readonly sourceLabel = input.required<string>();
    readonly resourceRows = input.required<PdfResourceSummaryRow[]>();
    readonly findings = input.required<AuditFinding[]>();

    readonly closeModal = output<void>();
    readonly downloadPdf = output<void>();

    readonly includeAiJudgmentCalls = signal(true);
    readonly includeRecommendedFixes = signal(true);

    readonly highFindings = computed(() => {
        const visible = this.visibleFindings();

        return visible.filter((item) => item.severity === "High");
    });

    readonly mediumFindings = computed(() => {
        const visible = this.visibleFindings();

        return visible.filter((item) => item.severity === "Medium");
    });

    readonly highCount = computed(() => this.highFindings().length);

    readonly mediumCount = computed(() => this.mediumFindings().length);

    readonly lowCount = computed(() => {
        const visible = this.visibleFindings();
        const lowItems = visible.filter((item) => item.severity === "Low");

        return lowItems.length;
    });

    private readonly visibleFindings = computed(() => {
        const allFindings = this.findings();
        const includeAi = this.includeAiJudgmentCalls();

        if (includeAi) {
            return allFindings;
        }

        return allFindings.filter((item) => !item.isAiJudgmentCall);
    });

    toggleAiOption(): void {
        this.includeAiJudgmentCalls.update((current) => !current);
    }

    toggleFixesOption(): void {
        this.includeRecommendedFixes.update((current) => !current);
    }
}
