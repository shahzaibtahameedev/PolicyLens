import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class OpaStatusService {
    readonly isConnected = signal(true);

    setOffline(): void {
        this.isConnected.set(false);
    }

    retryConnection(): void {
        this.isConnected.set(true);
    }
}
