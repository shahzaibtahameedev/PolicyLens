import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    model,
    signal,
    viewChild,
} from "@angular/core";
import type * as MonacoApi from "monaco-editor";
import {
    EDITOR_FONT_FAMILY,
    EDITOR_FONT_SIZE,
    EDITOR_LINE_HEIGHT,
    EDITOR_MARKER_OWNER,
    EDITOR_PADDING,
    EDITOR_TAB_SIZE,
    EDITOR_THEME_ID,
    REGO_LANGUAGE_ID,
} from "../../core/constants";
import { loadMonaco } from "../../core/monaco-loader";
import type { EditorMarker } from "../../core/models";

@Component({
    selector: "pl-code-editor",
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="relative h-full w-full">
            <div #host class="h-full w-full"></div>

            @if (isLoading()) {
                <div class="absolute inset-0 grid place-items-center bg-canvas/70 text-sm text-ink-faint">
                    Loading editor...
                </div>
            }

            @if (loadErrorMessage()) {
                <div class="absolute inset-0 grid place-items-center bg-canvas/90 px-6 text-center text-sm text-high">
                    {{ loadErrorMessage() }}
                </div>
            }
        </div>
    `,
})
export class CodeEditor {
    readonly value = model<string>("");
    readonly language = input<string>(REGO_LANGUAGE_ID);
    readonly readOnly = input<boolean>(false);
    readonly markers = input<EditorMarker[]>([]);

    readonly isLoading = signal(true);
    readonly loadErrorMessage = signal<string>("");

    private readonly host = viewChild.required<ElementRef<HTMLDivElement>>("host");
    private monaco: typeof MonacoApi | null = null;
    private editor: MonacoApi.editor.IStandaloneCodeEditor | null = null;

    constructor() {
        afterNextRender(() => {
            void this.createEditor();
        });

        effect(() => {
            const text = this.value();

            this.pushValueToEditor(text);
        });

        effect(() => {
            const isReadOnly = this.readOnly();

            this.editor?.updateOptions({ readOnly: isReadOnly });
        });

        effect(() => {
            const languageId = this.language();

            this.applyLanguage(languageId);
        });

        effect(() => {
            const markers = this.markers();

            this.applyMarkers(markers);
        });

        inject(DestroyRef).onDestroy(() => {
            this.editor?.dispose();
        });
    }

    revealPosition(row: number, column: number): void {
        const editor = this.editor;

        if (!editor) {
            return;
        }

        editor.revealLineInCenter(row);
        editor.setPosition({ lineNumber: row, column });
        editor.focus();
    }

    private async createEditor(): Promise<void> {
        try {
            const monaco = await loadMonaco();
            const hostElement = this.host().nativeElement;
            const editor = monaco.editor.create(hostElement, {
                value: this.value(),
                language: this.language(),
                theme: EDITOR_THEME_ID,
                readOnly: this.readOnly(),
                automaticLayout: true,
                minimap: { enabled: false },
                fontFamily: EDITOR_FONT_FAMILY,
                fontSize: EDITOR_FONT_SIZE,
                lineHeight: EDITOR_LINE_HEIGHT,
                tabSize: EDITOR_TAB_SIZE,
                padding: { top: EDITOR_PADDING, bottom: EDITOR_PADDING },
                scrollBeyondLastLine: false,
                renderLineHighlight: "line",
                smoothScrolling: true,
                scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
            });

            editor.onDidChangeModelContent(() => {
                const editorText = editor.getValue();

                this.value.set(editorText);
            });

            this.monaco = monaco;
            this.editor = editor;
            this.isLoading.set(false);
            this.applyMarkers(this.markers());
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.isLoading.set(false);
            this.loadErrorMessage.set(message);
        }
    }

    // The editor is the source of truth while the user types, so a value coming back in
    // is only written when it genuinely differs - otherwise the cursor would jump.
    private pushValueToEditor(text: string): void {
        const editor = this.editor;

        if (!editor) {
            return;
        }

        const currentText = editor.getValue();
        const isSameText = currentText === text;

        if (isSameText) {
            return;
        }

        editor.setValue(text);
    }

    private applyLanguage(languageId: string): void {
        const monaco = this.monaco;
        const model = this.editor?.getModel();

        if (!monaco || !model) {
            return;
        }

        monaco.editor.setModelLanguage(model, languageId);
    }

    private applyMarkers(markers: EditorMarker[]): void {
        const monaco = this.monaco;
        const model = this.editor?.getModel();

        if (!monaco || !model) {
            return;
        }

        const lineCount = model.getLineCount();
        const monacoMarkers = markers.map((marker) => {
            const row = Math.min(marker.row, lineCount);
            const endColumn = model.getLineMaxColumn(row);

            return {
                severity: monaco.MarkerSeverity.Error,
                message: marker.message,
                startLineNumber: row,
                startColumn: marker.col,
                endLineNumber: row,
                endColumn,
            };
        });

        monaco.editor.setModelMarkers(model, EDITOR_MARKER_OWNER, monacoMarkers);
    }
}
