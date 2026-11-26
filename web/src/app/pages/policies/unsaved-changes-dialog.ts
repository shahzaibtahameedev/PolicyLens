import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

@Component({
    selector: "pl-unsaved-changes-dialog",
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" (click)="keepEditing.emit()">
            <section
                class="flex w-full max-w-[520px] flex-col gap-3.5 rounded-lg bg-surface p-7 shadow-pane"
                (click)="$event.stopPropagation()"
                role="dialog"
                aria-modal="true"
                aria-label="Leave without saving"
            >
                <h2 class="text-[22px] font-semibold leading-7 text-ink">Leave without saving?</h2>
                <p class="text-[15px] leading-[22px] text-pretty text-body">
                    You changed {{ changedLineCount() }}
                    {{ changedLineCount() === 1 ? "line" : "lines" }} in {{ fileName() }}. If you go to
                    {{ destinationLabel() }} now, your changes will be lost.
                </p>

                <div class="mt-3 flex justify-end gap-2.5">
                    <button
                        type="button"
                        (click)="keepEditing.emit()"
                        class="h-9 cursor-pointer rounded-xs border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-hover"
                    >
                        Keep editing
                    </button>
                    <button
                        type="button"
                        (click)="discardChanges.emit()"
                        class="h-9 cursor-pointer rounded-xs border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-hover"
                    >
                        Discard changes
                    </button>
                    <button
                        type="button"
                        (click)="saveAndLeave.emit()"
                        class="h-9 cursor-pointer rounded-xs bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover"
                    >
                        Save and leave
                    </button>
                </div>
            </section>
        </div>
    `,
})
export class UnsavedChangesDialog {
    readonly fileName = input.required<string>();
    readonly changedLineCount = input.required<number>();
    readonly destinationLabel = input<string>("another page");

    readonly keepEditing = output<void>();
    readonly discardChanges = output<void>();
    readonly saveAndLeave = output<void>();
}
