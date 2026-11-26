import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import type { SeverityLevel } from "../../core/models";

@Component({
    selector: "pl-severity-badge",
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @switch (severity()) {
            @case ("High") {
                <span
                    class="inline-flex h-6 items-center gap-2 rounded-xs bg-error-tint px-2.5 text-[13px] font-semibold text-error-text"
                >
                    <span class="size-2 rotate-45 bg-error"></span>
                    <span>High</span>
                </span>
            }
            @case ("Medium") {
                <span
                    class="inline-flex h-6 items-center gap-2 rounded-xs bg-warning-tint px-2.5 text-[13px] font-semibold text-warning-text"
                >
                    <span
                        class="h-0 w-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-warning"
                    ></span>
                    <span>Medium</span>
                </span>
            }
            @case ("Low") {
                <span
                    class="inline-flex h-6 items-center gap-2 rounded-xs bg-surface-soft px-2.5 text-[13px] font-semibold text-body"
                >
                    <span class="size-2.5 rounded-full bg-subtle"></span>
                    <span>Low</span>
                </span>
            }
        }
    `,
})
export class SeverityBadge {
    readonly severity = input.required<SeverityLevel>();
}
