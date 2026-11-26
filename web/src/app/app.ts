import type { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { catchError, of, switchMap, timer } from "rxjs";
import { readApiFailure } from "./core/api-errors";
import { ApiService } from "./core/api.service";
import { HEALTH_POLL_INTERVAL_MS, SYNC_SUCCESS_MESSAGE } from "./core/constants";
import type { HealthStatus } from "./core/models";
import { NotificationService } from "./core/notification.service";

const OFFLINE_HEALTH: HealthStatus = { isOpaReachable: false, policyCount: 0, resourceCount: 0 };

@Component({
    selector: "pl-root",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, RouterLinkActive, RouterOutlet],
    template: `
        <div class="flex h-full flex-col">
            <header class="flex shrink-0 items-center gap-6 border-b border-edge bg-panel px-6 py-3">
                <div class="flex items-baseline gap-2">
                    <span class="text-[15px] font-semibold tracking-tight text-ink">PolicyLens</span>
                    <span class="hidden text-xs text-ink-faint sm:inline">Azure compliance audit</span>
                </div>

                <nav class="flex items-center gap-1">
                    <a
                        routerLink="/policies"
                        routerLinkActive="bg-raised text-ink ring-1 ring-edge-strong"
                        class="rounded-md px-3 py-1.5 text-sm font-medium text-ink-dim transition hover:text-ink"
                    >
                        Policies
                    </a>
                    <a
                        routerLink="/audit"
                        routerLinkActive="bg-raised text-ink ring-1 ring-edge-strong"
                        class="rounded-md px-3 py-1.5 text-sm font-medium text-ink-dim transition hover:text-ink"
                    >
                        Audit
                    </a>
                </nav>

                <div class="ml-auto flex items-center gap-3">
                    <button
                        type="button"
                        (click)="syncPolicies()"
                        [disabled]="isSyncing()"
                        class="rounded-md border border-edge-strong px-3 py-1.5 text-xs font-medium text-ink-dim transition hover:border-accent hover:text-ink disabled:opacity-50"
                    >
                        {{ isSyncing() ? "Syncing..." : "Re-sync to OPA" }}
                    </button>

                    <div
                        class="flex items-center gap-2 rounded-md bg-raised px-3 py-1.5 text-xs ring-1 ring-edge-strong"
                        [title]="statusTitle()"
                    >
                        <span
                            class="size-2 rounded-full"
                            [class]="health().isOpaReachable ? 'bg-pass shadow-[0_0_8px] shadow-pass/60' : 'bg-high'"
                        ></span>
                        <span class="text-ink-dim">{{ health().isOpaReachable ? "OPA connected" : "OPA offline" }}</span>
                    </div>
                </div>
            </header>

            <main class="min-h-0 flex-1">
                <router-outlet />
            </main>

            @if (notifications.message()) {
                <div
                    class="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm shadow-xl ring-1"
                    [class]="
                        notifications.isError()
                            ? 'bg-high/10 text-high ring-high/30'
                            : 'bg-raised text-ink ring-edge-strong'
                    "
                >
                    {{ notifications.message() }}
                </div>
            }
        </div>
    `,
})
export class App {
    private readonly api = inject(ApiService);
    readonly notifications = inject(NotificationService);

    readonly isSyncing = signal(false);

    readonly health = toSignal(
        timer(0, HEALTH_POLL_INTERVAL_MS).pipe(
            switchMap(() => this.api.getHealth().pipe(catchError(() => of(OFFLINE_HEALTH)))),
        ),
        { initialValue: OFFLINE_HEALTH },
    );

    statusTitle(): string {
        const health = this.health();

        if (!health.isOpaReachable) {
            return "The API cannot reach OPA. Start it with: opa run --server";
        }

        return `${health.policyCount} policies, ${health.resourceCount} resources`;
    }

    syncPolicies(): void {
        this.isSyncing.set(true);

        this.api.syncPolicies().subscribe({
            next: (syncResult) => {
                this.isSyncing.set(false);

                const hasFailures = syncResult.failedPolicies.length > 0;

                if (hasFailures) {
                    const failedIds = syncResult.failedPolicies.map((failure) => failure.id).join(", ");

                    this.notifications.showError(`These policies did not compile: ${failedIds}`);

                    return;
                }

                this.notifications.showSuccess(SYNC_SUCCESS_MESSAGE);
            },
            error: (errorResponse: HttpErrorResponse) => {
                const failure = readApiFailure(errorResponse);

                this.isSyncing.set(false);
                this.notifications.showError(failure.message);
            },
        });
    }
}
