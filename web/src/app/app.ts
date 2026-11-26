import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { NotificationService } from "./core/notification.service";
import { Sidebar } from "./shared/sidebar/sidebar";

@Component({
    selector: "pl-root",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterOutlet, Sidebar],
    template: `
        <div class="flex h-full flex-col bg-canvas text-ink md:flex-row">
            <header class="flex h-12 shrink-0 items-center gap-3 border-b border-hairline bg-surface px-4 md:hidden">
                <button
                    type="button"
                    (click)="openMobileNav()"
                    aria-label="Open navigation"
                    class="flex size-9 cursor-pointer items-center justify-center rounded-xs text-lg text-ink hover:bg-surface-hover"
                >
                    ☰
                </button>
                <div class="flex items-center gap-2">
                    <span class="flex size-6 items-center justify-center rounded bg-primary">
                        <span class="size-2 rounded-full border-2 border-white"></span>
                    </span>
                    <span class="text-base font-semibold text-ink">PolicyLens</span>
                </div>
            </header>

            <pl-sidebar [mobileOpen]="isMobileNavOpen()" (closeMobile)="closeMobileNav()" />

            <main class="min-h-0 min-w-0 flex-1 overflow-hidden">
                <router-outlet />
            </main>

            @if (notifications.message()) {
                <div
                    class="pointer-events-none fixed right-6 bottom-6 z-50 rounded border px-4 py-3 text-sm shadow-pane"
                    [class]="
                        notifications.isError()
                            ? 'border-error-border bg-error-tint text-error-text'
                            : 'border-hairline bg-surface text-ink'
                    "
                >
                    {{ notifications.message() }}
                </div>
            }
        </div>
    `,
})
export class App {
    readonly notifications = inject(NotificationService);
    readonly isMobileNavOpen = signal(false);

    openMobileNav(): void {
        this.isMobileNavOpen.set(true);
    }

    closeMobileNav(): void {
        this.isMobileNavOpen.set(false);
    }
}
