import { Injectable, signal } from "@angular/core";
import { TOAST_DURATION_MS } from "./constants";

@Injectable({ providedIn: "root" })
export class NotificationService {
    readonly message = signal<string>("");
    readonly isError = signal(false);

    private dismissTimeoutId: number | null = null;

    showSuccess(message: string): void {
        this.show(message, false);
    }

    showError(message: string): void {
        this.show(message, true);
    }

    private show(message: string, isError: boolean): void {
        const hasPendingDismiss = this.dismissTimeoutId !== null;

        if (hasPendingDismiss) {
            window.clearTimeout(this.dismissTimeoutId ?? undefined);
        }

        this.message.set(message);
        this.isError.set(isError);
        this.dismissTimeoutId = window.setTimeout(() => {
            this.message.set("");
        }, TOAST_DURATION_MS);
    }
}
