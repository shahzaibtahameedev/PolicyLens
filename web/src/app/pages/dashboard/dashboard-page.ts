import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { INITIAL_DASHBOARD_SUMMARY } from "../../core/mock-data";
import type { DashboardSummary, RecentAuditRun } from "../../core/models";
import { PolicyStoreService } from "../../core/policy-store.service";

const SVG_WIDTH = 600;
const SVG_HEIGHT = 170;
const TREND_MIN_PERCENT = 70;
const TREND_RANGE_PERCENT = 20;

const TIME_RANGE_OPTIONS = ["Last 7 days", "Last 30 days", "Last 90 days"] as const;

type TimeRangeOption = (typeof TIME_RANGE_OPTIONS)[number];

@Component({
    selector: "pl-dashboard-page",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink],
    template: `
        <div class="flex h-full flex-col overflow-y-auto bg-canvas text-ink">
            <div class="flex h-9 shrink-0 items-center gap-1.5 px-7 text-[13px] text-muted">
                <a routerLink="/dashboard" class="text-link no-underline hover:text-link-hover">PolicyLens</a>
                <span>›</span>
                <span>Dashboard</span>
            </div>

            <div class="flex shrink-0 flex-wrap items-center justify-between gap-3 px-7 pb-4">
                <div>
                    <h1 class="text-[28px] font-semibold leading-9 text-ink">Dashboard</h1>
                    <p class="mt-0.5 text-[13px] leading-[18px] text-muted">
                        @if (hasAudits()) {
                            Compliance across all audits · {{ summary().updatedLabel }}
                        } @else {
                            Compliance across all audits
                        }
                    </p>
                </div>

                @if (hasAudits()) {
                    <div class="flex items-center gap-2.5">
                        <div class="relative">
                            <select
                                aria-label="Time range"
                                [value]="selectedRange()"
                                (change)="onRangeChange($event)"
                                class="h-9 cursor-pointer appearance-none rounded-xs border border-border bg-surface py-0 pr-8 pl-3 text-sm text-ink focus:border-b-2 focus:border-b-primary"
                            >
                                @for (option of timeRangeOptions; track option) {
                                    <option [value]="option">{{ option }}</option>
                                }
                            </select>
                            <span class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">
                                ▾
                            </span>
                        </div>

                        <button
                            type="button"
                            (click)="startNewAudit()"
                            class="h-9 cursor-pointer rounded-xs bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-hover active:bg-primary-pressed"
                        >
                            + New audit
                        </button>
                    </div>
                }
            </div>

            @if (hasAudits()) {
                <div class="grid grid-cols-1 gap-4 px-7 pt-1 pb-6 lg:grid-cols-4">
                    <div class="rounded border border-hairline bg-surface px-5 py-4 shadow-tile">
                        <div class="text-sm font-semibold text-ink">Audits run</div>
                        <div class="mt-1.5 font-metric text-[34px] font-semibold leading-10 text-ink">
                            {{ summary().auditsRun }}
                        </div>
                        <div class="mt-1 text-[13px] leading-[18px] text-muted">
                            {{ summary().auditsThisWeek }} this week
                        </div>
                    </div>

                    <div class="rounded border border-hairline bg-surface px-5 py-4 shadow-tile">
                        <div class="text-sm font-semibold text-ink">Resources scanned</div>
                        <div class="mt-1.5 font-metric text-[34px] font-semibold leading-10 text-ink">
                            {{ summary().resourcesScanned }}
                        </div>
                        <div class="mt-1 text-[13px] leading-[18px] text-muted">
                            Across {{ summary().resourceTypesCount }} resource types
                        </div>
                    </div>

                    <div class="rounded border border-hairline bg-surface px-5 py-4 shadow-tile">
                        <div class="text-sm font-semibold text-ink">Open findings</div>
                        <div class="mt-1.5 font-metric text-[34px] font-semibold leading-10 text-ink">
                            {{ summary().openFindings }}
                        </div>
                        <div class="mt-1 flex items-center gap-1.5 text-[13px] leading-[18px] text-error-text">
                            <span class="size-2 rotate-45 bg-error"></span>
                            <span>{{ summary().highSeverityFindings }} high severity</span>
                        </div>
                    </div>

                    <div class="rounded border border-hairline bg-surface px-5 py-4 shadow-tile">
                        <div class="text-sm font-semibold text-ink">Compliance rate</div>
                        <div class="mt-1.5 font-metric text-[34px] font-semibold leading-10 text-ink">
                            {{ summary().complianceRate }}%
                        </div>
                        <div class="mt-1 text-[13px] leading-[18px] text-success">
                            ▲ {{ summary().complianceDeltaPoints }} pts in 30 days
                        </div>
                    </div>

                    <div class="flex flex-col gap-3.5 rounded border border-hairline bg-surface px-5 py-4 shadow-tile">
                        <div class="flex items-baseline justify-between">
                            <span class="text-sm font-semibold text-ink">Open findings by severity</span>
                            <span class="text-[13px] text-muted">{{ totalSeverityCount() }} total</span>
                        </div>

                        <div class="flex h-2.5 gap-0.5 overflow-hidden rounded-xs">
                            <span class="bg-error" [style.flex]="summary().severityCounts.high"></span>
                            <span class="bg-warning" [style.flex]="summary().severityCounts.medium"></span>
                            <span class="bg-subtle" [style.flex]="summary().severityCounts.low"></span>
                        </div>

                        <div class="flex flex-col">
                            <div class="flex h-10 items-center gap-2.5 border-b border-hairline text-sm">
                                <span class="mx-0.5 size-2.5 rotate-45 bg-error"></span>
                                <span>High</span>
                                <span class="ml-auto font-semibold">{{ summary().severityCounts.high }}</span>
                                <span class="w-11 text-right text-[13px] text-muted">{{ highPercent() }}%</span>
                            </div>

                            <div class="flex h-10 items-center gap-2.5 border-b border-hairline text-sm">
                                <span
                                    class="h-0 w-0 border-x-[6px] border-b-[11px] border-x-transparent border-b-warning"
                                ></span>
                                <span>Medium</span>
                                <span class="ml-auto font-semibold">{{ summary().severityCounts.medium }}</span>
                                <span class="w-11 text-right text-[13px] text-muted">{{ mediumPercent() }}%</span>
                            </div>

                            <div class="flex h-10 items-center gap-2.5 text-sm">
                                <span class="mx-px size-3 rounded-full bg-subtle"></span>
                                <span>Low</span>
                                <span class="ml-auto font-semibold">{{ summary().severityCounts.low }}</span>
                                <span class="w-11 text-right text-[13px] text-muted">{{ lowPercent() }}%</span>
                            </div>
                        </div>
                    </div>

                    <div
                        class="flex flex-col gap-2.5 rounded border border-hairline bg-surface px-5 py-4 shadow-tile lg:col-span-2"
                    >
                        <div class="flex items-baseline justify-between gap-2">
                            <span class="text-sm font-semibold text-ink">Compliance rate · last 30 days</span>
                            <span class="text-[13px] text-muted">Share of audited resources with no findings</span>
                        </div>

                        <div class="flex gap-2.5">
                            <div
                                class="-mt-1 flex h-[170px] w-8 flex-col justify-between text-right text-xs leading-3 text-muted"
                            >
                                <span>90%</span>
                                <span>80%</span>
                                <span>70%</span>
                            </div>

                            <div class="relative h-[170px] flex-1">
                                <svg
                                    class="block h-[170px] w-full"
                                    viewBox="0 0 600 170"
                                    preserveAspectRatio="none"
                                    aria-label="Compliance rate trend"
                                >
                                    <line x1="0" y1="0.5" x2="600" y2="0.5" stroke="#e0e0e0" />
                                    <line x1="0" y1="85" x2="600" y2="85" stroke="#e0e0e0" />
                                    <line x1="0" y1="169.5" x2="600" y2="169.5" stroke="#d1d1d1" />
                                    <polygon [attr.points]="trendAreaPoints()" fill="#0078d4" fill-opacity="0.08" />
                                    <polyline
                                        [attr.points]="trendLinePoints()"
                                        fill="none"
                                        stroke="#0078d4"
                                        stroke-width="2"
                                        vector-effect="non-scaling-stroke"
                                    />
                                </svg>
                                <span
                                    class="absolute right-0 -mt-1.5 -mr-1.5 size-2.5 rounded-full border-2 border-primary bg-surface"
                                    [style.top.px]="trendLastPointTop()"
                                ></span>
                            </div>
                        </div>

                        <div class="flex justify-between pl-10 text-xs leading-4 text-muted">
                            @for (label of summary().complianceTrendLabels; track label) {
                                <span>{{ label }}</span>
                            }
                        </div>
                    </div>

                    <div class="flex flex-col gap-3 rounded border border-hairline bg-surface px-5 py-4 shadow-tile">
                        <span class="text-sm font-semibold text-ink">Last scanned resource</span>

                        <div class="flex items-center gap-3">
                            <span
                                class="flex size-9 shrink-0 items-center justify-center rounded bg-primary-tint-strong text-[13px] font-semibold text-primary"
                            >
                                {{ summary().lastScanned.shortCode }}
                            </span>
                            <div class="min-w-0">
                                <a
                                    (click)="openLatestResults()"
                                    class="cursor-pointer text-sm font-semibold text-link no-underline hover:text-link-hover"
                                >
                                    {{ summary().lastScanned.name }}
                                </a>
                                <div class="truncate text-[13px] leading-[18px] text-muted">
                                    {{ summary().lastScanned.typeLabel }} · {{ summary().lastScanned.resourceGroup }}
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-[80px_1fr] gap-y-1.5 text-[13px] leading-[18px]">
                            <span class="text-muted">Scanned</span>
                            <span>{{ summary().lastScanned.scannedAtLabel }}</span>
                            <span class="text-muted">Findings</span>
                            <span class="font-semibold">{{ summary().lastScanned.totalFindings }}</span>
                        </div>

                        <div class="flex flex-wrap gap-3.5 text-[13px]">
                            <span class="flex items-center gap-1.5 text-error-text">
                                <span class="size-2 rotate-45 bg-error"></span>
                                <span>{{ summary().lastScanned.highCount }} High</span>
                            </span>
                            <span class="flex items-center gap-1.5 text-warning-text">
                                <span
                                    class="h-0 w-0 border-x-[5px] border-b-[8px] border-x-transparent border-b-warning"
                                ></span>
                                <span>{{ summary().lastScanned.mediumCount }} Medium</span>
                            </span>
                            <span class="flex items-center gap-1.5 text-body">
                                <span class="size-2 rounded-full bg-subtle"></span>
                                <span>{{ summary().lastScanned.lowCount }} Low</span>
                            </span>
                        </div>

                        <button
                            type="button"
                            (click)="openLatestResults()"
                            class="mt-auto w-fit cursor-pointer text-left text-sm text-link hover:text-link-hover"
                        >
                            Open results ›
                        </button>
                    </div>

                    <div class="flex flex-col gap-1.5 rounded border border-hairline bg-surface px-5 py-4 shadow-tile">
                        <div class="mb-1 flex items-baseline justify-between">
                            <span class="text-sm font-semibold text-ink">Most failed policies</span>
                            <span class="text-[13px] text-muted">Fails, 30 days</span>
                        </div>

                        @for (policy of summary().mostFailedPolicies; track policy.id) {
                            <button
                                type="button"
                                (click)="openPolicy(policy.id)"
                                class="flex cursor-pointer flex-col gap-1.5 border-b border-hairline py-2 text-left transition last:border-b-0 hover:bg-surface-hover"
                            >
                                <div class="flex w-full items-baseline gap-2">
                                    <span class="font-mono text-[13px] text-muted">{{ policy.id }}</span>
                                    <span class="min-w-0 flex-1 truncate text-sm text-ink">{{ policy.title }}</span>
                                    <span class="text-sm font-semibold text-ink">{{ policy.failCount }}</span>
                                </div>
                                <div class="h-1.5 w-full rounded-xs bg-surface-disabled">
                                    <div
                                        class="h-1.5 rounded-xs bg-primary"
                                        [style.width.%]="policy.percentWidth"
                                    ></div>
                                </div>
                            </button>
                        }
                    </div>

                    <div
                        class="flex flex-col overflow-hidden rounded border border-hairline bg-surface shadow-tile lg:col-span-3"
                    >
                        <div class="flex items-center justify-between px-5 pt-4 pb-2.5">
                            <span class="text-sm font-semibold text-ink">Recent audit runs</span>
                            <button
                                type="button"
                                (click)="openLatestResults()"
                                class="cursor-pointer text-sm text-link hover:text-link-hover"
                            >
                                View all {{ summary().auditsRun }}
                            </button>
                        </div>

                        <div class="overflow-x-auto">
                            <div class="min-w-[820px]">
                                <div
                                    class="grid h-11 grid-cols-[185px_165px_105px_95px_minmax(0,1fr)_210px_20px] items-center gap-3 border-b border-border px-5 text-sm font-semibold text-ink"
                                >
                                    <span>Date and time ↓</span>
                                    <span>Resource type</span>
                                    <span>Source</span>
                                    <span>Resources</span>
                                    <span>Findings</span>
                                    <span>Status</span>
                                    <span></span>
                                </div>

                                @for (run of summary().recentRuns; track run.id) {
                                    <div
                                        (click)="openRun(run)"
                                        class="grid h-11 cursor-pointer grid-cols-[185px_165px_105px_95px_minmax(0,1fr)_210px_20px] items-center gap-3 border-b border-hairline px-5 text-sm transition last:border-b-0 hover:bg-surface-hover"
                                    >
                                        <span class="text-link">{{ run.dateLabel }}</span>
                                        <span>{{ run.resourceType }}</span>
                                        <span>{{ run.source }}</span>
                                        <span>{{ run.resourceCount }}</span>

                                        <span class="flex gap-4 text-[13px]">
                                            @if (run.status === "Completed") {
                                                <span class="flex w-9 items-center gap-1.5">
                                                    <span class="size-2 rotate-45 bg-error"></span>
                                                    <span>{{ run.highCount }}</span>
                                                </span>
                                                <span class="flex w-9 items-center gap-1.5">
                                                    <span
                                                        class="h-0 w-0 border-x-[5px] border-b-[8px] border-x-transparent border-b-warning"
                                                    ></span>
                                                    <span>{{ run.mediumCount }}</span>
                                                </span>
                                                <span class="flex w-9 items-center gap-1.5">
                                                    <span class="size-2 rounded-full bg-subtle"></span>
                                                    <span>{{ run.lowCount }}</span>
                                                </span>
                                            } @else {
                                                <span class="text-muted">—</span>
                                            }
                                        </span>

                                        <span>
                                            @if (run.status === "Completed") {
                                                <span class="flex items-center gap-2 text-[13px] text-ink">
                                                    <span class="size-2 rounded-full bg-success"></span>
                                                    <span>Completed</span>
                                                </span>
                                            } @else {
                                                <span class="flex items-center gap-2 text-[13px] text-error-text">
                                                    <span class="text-xs">✕</span>
                                                    <span>Failed · {{ run.failureReason }}</span>
                                                </span>
                                            }
                                        </span>

                                        <span class="text-muted">›</span>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            } @else {
                <div class="grid flex-1 grid-cols-1 grid-rows-[auto_1fr] gap-4 px-7 pt-1 pb-7 lg:grid-cols-4">
                    <div class="rounded border border-hairline bg-surface px-5 py-4">
                        <div class="text-sm font-semibold">Audits run</div>
                        <div class="mt-1.5 font-metric text-[34px] font-semibold leading-10 text-disabled-text">
                            —
                        </div>
                        <div class="mt-1 text-[13px] leading-[18px] text-muted">No audits yet</div>
                    </div>
                    <div class="rounded border border-hairline bg-surface px-5 py-4">
                        <div class="text-sm font-semibold">Resources scanned</div>
                        <div class="mt-1.5 font-metric text-[34px] font-semibold leading-10 text-disabled-text">
                            —
                        </div>
                        <div class="mt-1 text-[13px] leading-[18px] text-muted">No audits yet</div>
                    </div>
                    <div class="rounded border border-hairline bg-surface px-5 py-4">
                        <div class="text-sm font-semibold">Open findings</div>
                        <div class="mt-1.5 font-metric text-[34px] font-semibold leading-10 text-disabled-text">
                            —
                        </div>
                        <div class="mt-1 text-[13px] leading-[18px] text-muted">No audits yet</div>
                    </div>
                    <div class="rounded border border-hairline bg-surface px-5 py-4">
                        <div class="text-sm font-semibold">Compliance rate</div>
                        <div class="mt-1.5 font-metric text-[34px] font-semibold leading-10 text-disabled-text">
                            —
                        </div>
                        <div class="mt-1 text-[13px] leading-[18px] text-muted">No audits yet</div>
                    </div>

                    <div
                        class="flex items-center justify-center rounded border border-hairline bg-surface p-10 shadow-tile lg:col-span-4"
                    >
                        <div class="flex max-w-[600px] flex-col items-center gap-3.5 text-center">
                            <div class="flex size-14 items-center justify-center rounded bg-primary-tint-strong">
                                <span class="size-5 rounded-full border-[3px] border-primary"></span>
                            </div>

                            <h2 class="text-2xl font-semibold leading-8 text-ink">No audits yet</h2>

                            <p class="text-[15px] leading-[22px] text-pretty text-body">
                                Check your Azure resources against the {{ totalRules() }} rules loaded in OPA. Pick a
                                resource type, upload a JSON export or sign in with Microsoft, and you'll get a list of
                                findings ranked by severity.
                            </p>

                            <div class="mt-2 flex gap-2.5">
                                <button
                                    type="button"
                                    (click)="startNewAudit()"
                                    class="h-9 cursor-pointer rounded-xs bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
                                >
                                    Run your first audit
                                </button>
                                <button
                                    type="button"
                                    (click)="browsePolicies()"
                                    class="h-9 cursor-pointer rounded-xs border border-border bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-hover"
                                >
                                    Browse policies
                                </button>
                            </div>

                            <div
                                class="mt-7 grid w-full grid-cols-1 gap-6 border-t border-hairline pt-6 text-left sm:grid-cols-3"
                            >
                                <div class="flex flex-col gap-1.5">
                                    <span
                                        class="size-7 rounded-full border border-border text-center text-[13px] font-semibold leading-[26px]"
                                    >
                                        1
                                    </span>
                                    <span class="text-sm font-semibold text-ink">Choose a resource type</span>
                                    <span class="text-[13px] leading-[18px] text-muted">
                                        Storage Account, Function App or Logic App
                                    </span>
                                </div>

                                <div class="flex flex-col gap-1.5">
                                    <span
                                        class="size-7 rounded-full border border-border text-center text-[13px] font-semibold leading-[26px]"
                                    >
                                        2
                                    </span>
                                    <span class="text-sm font-semibold text-ink">Provide resources</span>
                                    <span class="text-[13px] leading-[18px] text-muted">
                                        Upload JSON or read them from Azure
                                    </span>
                                </div>

                                <div class="flex flex-col gap-1.5">
                                    <span
                                        class="size-7 rounded-full border border-border text-center text-[13px] font-semibold leading-[26px]"
                                    >
                                        3
                                    </span>
                                    <span class="text-sm font-semibold text-ink">Review findings</span>
                                    <span class="text-[13px] leading-[18px] text-muted">
                                        With plain-English explanations and fixes
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>
    `,
})
export class DashboardPage {
    private readonly router = inject(Router);
    private readonly policyStore = inject(PolicyStoreService);

    readonly timeRangeOptions = TIME_RANGE_OPTIONS;
    readonly selectedRange = signal<TimeRangeOption>("Last 30 days");
    readonly hasAudits = signal(true);
    readonly summary = signal<DashboardSummary>(INITIAL_DASHBOARD_SUMMARY);
    readonly totalRules = this.policyStore.totalRuleCount;

    readonly totalSeverityCount = computed(() => {
        const counts = this.summary().severityCounts;
        const total = counts.high + counts.medium + counts.low;

        return total;
    });

    readonly highPercent = computed(() => {
        const counts = this.summary().severityCounts;
        const total = this.totalSeverityCount();

        if (total === 0) {
            return 0;
        }

        const percentage = Math.round((counts.high / total) * 100);

        return percentage;
    });

    readonly mediumPercent = computed(() => {
        const counts = this.summary().severityCounts;
        const total = this.totalSeverityCount();

        if (total === 0) {
            return 0;
        }

        const percentage = Math.round((counts.medium / total) * 100);

        return percentage;
    });

    readonly lowPercent = computed(() => {
        const counts = this.summary().severityCounts;
        const total = this.totalSeverityCount();

        if (total === 0) {
            return 0;
        }

        const percentage = Math.round((counts.low / total) * 100);

        return percentage;
    });

    readonly trendLinePoints = computed(() => {
        const values = this.summary().complianceTrendPoints;
        const count = values.length;

        if (count < 2) {
            return "";
        }

        const pairs = values.map((value, index) => {
            const x = ((index / (count - 1)) * SVG_WIDTH).toFixed(1);
            const y = this.computeTrendY(value).toFixed(1);

            return `${x},${y}`;
        });

        const joined = pairs.join(" ");

        return joined;
    });

    readonly trendAreaPoints = computed(() => {
        const line = this.trendLinePoints();

        if (!line) {
            return "";
        }

        const polygon = `${line} ${SVG_WIDTH},${SVG_HEIGHT} 0,${SVG_HEIGHT}`;

        return polygon;
    });

    readonly trendLastPointTop = computed(() => {
        const values = this.summary().complianceTrendPoints;
        const lastValue = values[values.length - 1];

        if (lastValue === undefined) {
            return 0;
        }

        const yPosition = this.computeTrendY(lastValue);

        return yPosition;
    });

    onRangeChange(event: Event): void {
        const target = event.target as HTMLSelectElement;
        const chosen = target.value as TimeRangeOption;

        this.selectedRange.set(chosen);
    }

    startNewAudit(): void {
        void this.router.navigate(["/audit"]);
    }

    browsePolicies(): void {
        void this.router.navigate(["/policies"]);
    }

    openLatestResults(): void {
        void this.router.navigate(["/audit"], { queryParams: { view: "results" } });
    }

    openRun(run: RecentAuditRun): void {
        const isCompleted = run.status === "Completed";

        if (!isCompleted) {
            return;
        }

        this.openLatestResults();
    }

    openPolicy(policyId: string): void {
        const isTaggingRule = policyId === "01";
        const fileName = isTaggingRule ? "tagging.rego" : "storage.rego";

        void this.router.navigate(["/policies"], { queryParams: { file: fileName } });
    }

    private computeTrendY(percentValue: number): number {
        const normalized = (percentValue - TREND_MIN_PERCENT) / TREND_RANGE_PERCENT;
        const yCoordinate = SVG_HEIGHT - normalized * SVG_HEIGHT;

        return yCoordinate;
    }
}
