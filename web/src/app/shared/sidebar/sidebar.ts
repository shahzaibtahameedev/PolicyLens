import { ChangeDetectionStrategy, Component, inject, input, output, signal } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { OPA_ENDPOINT_LABEL } from "../../core/constants";
import { OpaStatusService } from "../../core/opa-status.service";

@Component({
    selector: "pl-sidebar",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, RouterLinkActive],
    template: `
        @if (mobileOpen()) {
            <div
                class="fixed inset-0 z-30 bg-black/30 md:hidden"
                (click)="closeMobile.emit()"
            ></div>
        }

        <aside
            class="fixed inset-y-0 left-0 z-40 flex h-full shrink-0 select-none flex-col overflow-hidden border-r border-hairline bg-surface text-ink transition-[width,transform] duration-200 ease-in-out md:static"
            [class]="asideClasses()"
        >
            <div
                class="flex h-16 shrink-0 items-center border-b border-hairline px-3.5"
                [class.justify-between]="!isCollapsed()"
                [class.justify-center]="isCollapsed()"
            >
                @if (!isCollapsed()) {
                    <div class="flex min-w-0 items-center gap-3 overflow-hidden">
                        <div class="flex size-8 shrink-0 items-center justify-center rounded bg-primary">
                            <span class="size-3 rounded-full border-[2.5px] border-white"></span>
                        </div>
                        <div class="flex min-w-0 flex-col">
                            <span class="truncate text-base font-semibold leading-5 text-ink">PolicyLens</span>
                            <span class="truncate text-xs leading-4 text-muted">Azure compliance audit</span>
                        </div>
                    </div>
                }

                <button
                    type="button"
                    (click)="toggleCollapse()"
                    [attr.aria-label]="isCollapsed() ? 'Expand navigation' : 'Collapse navigation'"
                    [title]="isCollapsed() ? 'Expand navigation' : 'Collapse navigation'"
                    class="hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-xs text-base text-muted transition hover:bg-surface-hover hover:text-ink md:flex"
                >
                    {{ isCollapsed() ? "»" : "«" }}
                </button>

                <button
                    type="button"
                    (click)="closeMobile.emit()"
                    aria-label="Close navigation"
                    class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xs text-base text-muted hover:bg-surface-hover hover:text-ink md:hidden"
                >
                    ✕
                </button>
            </div>

            <nav class="flex flex-col gap-1 p-2.5" aria-label="Primary navigation">
                <a
                    routerLink="/dashboard"
                    routerLinkActive="bg-surface-selected font-semibold [&_.nav-bar]:bg-primary"
                    (click)="onNavClick()"
                    title="Dashboard"
                    class="relative flex h-11 items-center gap-3 rounded px-3 text-sm text-ink transition hover:bg-surface-hover"
                    [class.justify-center]="isCollapsed()"
                    [class.px-0]="isCollapsed()"
                >
                    <span class="nav-bar absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-xs bg-transparent"></span>
                    <svg class="size-[18px] shrink-0" viewBox="0 0 16 16" fill="none" stroke="#0078d4" stroke-width="1.3">
                        <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1"></rect>
                        <rect x="9" y="1.5" width="5.5" height="5.5" rx="1"></rect>
                        <rect x="1.5" y="9" width="5.5" height="5.5" rx="1"></rect>
                        <rect x="9" y="9" width="5.5" height="5.5" rx="1"></rect>
                    </svg>
                    @if (!isCollapsed()) {
                        <span class="truncate whitespace-nowrap">Dashboard</span>
                    }
                </a>

                <a
                    routerLink="/audit"
                    routerLinkActive="bg-surface-selected font-semibold [&_.nav-bar]:bg-primary"
                    (click)="onNavClick()"
                    title="Audit"
                    class="relative flex h-11 items-center gap-3 rounded px-3 text-sm text-ink transition hover:bg-surface-hover"
                    [class.justify-center]="isCollapsed()"
                    [class.px-0]="isCollapsed()"
                >
                    <span class="nav-bar absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-xs bg-transparent"></span>
                    <svg class="size-[18px] shrink-0" viewBox="0 0 16 16" fill="none" stroke="#0078d4" stroke-width="1.3">
                        <circle cx="7" cy="7" r="5"></circle>
                        <line x1="10.6" y1="10.6" x2="14.5" y2="14.5"></line>
                    </svg>
                    @if (!isCollapsed()) {
                        <span class="truncate whitespace-nowrap">Audit</span>
                    }
                </a>

                <a
                    routerLink="/policies"
                    routerLinkActive="bg-surface-selected font-semibold [&_.nav-bar]:bg-primary"
                    (click)="onNavClick()"
                    title="Policies"
                    class="relative flex h-11 items-center gap-3 rounded px-3 text-sm text-ink transition hover:bg-surface-hover"
                    [class.justify-center]="isCollapsed()"
                    [class.px-0]="isCollapsed()"
                >
                    <span class="nav-bar absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-xs bg-transparent"></span>
                    <svg class="size-[18px] shrink-0" viewBox="0 0 16 16" fill="none" stroke="#0078d4" stroke-width="1.3">
                        <rect x="2.5" y="1.5" width="11" height="13" rx="1"></rect>
                        <line x1="5" y1="5.5" x2="11" y2="5.5"></line>
                        <line x1="5" y1="8.5" x2="11" y2="8.5"></line>
                        <line x1="5" y1="11.5" x2="9" y2="11.5"></line>
                    </svg>
                    @if (!isCollapsed()) {
                        <span class="truncate whitespace-nowrap">Policies</span>
                    }
                </a>
            </nav>

            <div class="mt-auto border-t border-hairline px-4 py-3.5">
                @if (opaStatus.isConnected()) {
                    <div
                        class="flex items-start gap-2.5"
                        [class.justify-center]="isCollapsed()"
                        [title]="'OPA connected · ' + opaEndpoint"
                    >
                        <span class="mt-1.5 size-2.5 shrink-0 rounded-full bg-success"></span>
                        @if (!isCollapsed()) {
                            <div class="flex min-w-0 flex-col">
                                <span class="text-sm font-semibold leading-5 text-ink">OPA connected</span>
                                <span class="font-mono text-[13px] leading-[18px] text-muted">{{ opaEndpoint }}</span>
                            </div>
                        }
                    </div>
                } @else {
                    <div
                        class="flex items-start gap-2.5"
                        [class.justify-center]="isCollapsed()"
                        [title]="'OPA not reachable · ' + opaEndpoint"
                    >
                        <span
                            class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-error text-[11px] font-semibold leading-4 text-white"
                        >
                            ✕
                        </span>
                        @if (!isCollapsed()) {
                            <div class="flex min-w-0 flex-col">
                                <span class="text-sm font-semibold leading-5 text-error-text">
                                    OPA not reachable
                                </span>
                                <span class="font-mono text-[13px] leading-[18px] text-muted">{{ opaEndpoint }}</span>
                                <button
                                    type="button"
                                    (click)="retryConnection()"
                                    class="mt-1 w-fit cursor-pointer text-left text-[13px] leading-[18px] text-link hover:text-link-hover"
                                >
                                    Retry connection
                                </button>
                            </div>
                        }
                    </div>
                }
            </div>
        </aside>
    `,
})
export class Sidebar {
    readonly opaStatus = inject(OpaStatusService);
    readonly opaEndpoint = OPA_ENDPOINT_LABEL;

    readonly mobileOpen = input<boolean>(false);
    readonly closeMobile = output<void>();

    readonly isCollapsed = signal(false);

    toggleCollapse(): void {
        this.isCollapsed.update((collapsed) => !collapsed);
    }

    onNavClick(): void {
        this.closeMobile.emit();
    }

    retryConnection(): void {
        this.opaStatus.retryConnection();
    }

    asideClasses(): string {
        const widthClass = this.isCollapsed() ? "w-[68px]" : "w-[256px]";
        const slideClass = this.mobileOpen() ? "translate-x-0" : "-translate-x-full md:translate-x-0";

        return `${widthClass} ${slideClass}`;
    }
}
