import type * as MonacoApi from "monaco-editor";
import {
    EDITOR_THEME_ID,
    MONACO_EDITOR_MODULE,
    MONACO_LOADER_PATH,
    MONACO_VS_PATH,
    REGO_LANGUAGE_ID,
} from "./constants";

type MonacoNamespace = typeof MonacoApi;

interface AmdLoader {
    (moduleIds: string[], onLoaded: () => void): void;
    config: (options: { paths: Record<string, string> }) => void;
}

interface MonacoWindow extends Window {
    monaco?: MonacoNamespace;
    require?: AmdLoader;
}

const REGO_MONARCH_LANGUAGE: MonacoApi.languages.IMonarchLanguage = {
    keywords: ["package", "import", "as", "default", "some", "every", "in", "with", "if", "contains", "else", "not"],
    literals: ["true", "false", "null"],
    builtins: [
        "count",
        "sprintf",
        "concat",
        "trim_space",
        "sort",
        "object",
        "time",
        "json",
        "sum",
        "max",
        "min",
        "lower",
        "upper",
        "startswith",
        "endswith",
        "regex",
        "to_number",
        "split",
        "contains",
    ],
    tokenizer: {
        root: [
            [/#.*$/, "comment"],
            [/"([^"\\]|\\.)*"/, "string"],
            [/\b\d+(\.\d+)?\b/, "number"],
            [
                /[a-zA-Z_]\w*/,
                {
                    cases: {
                        "@keywords": "keyword",
                        "@literals": "constant",
                        "@builtins": "type.identifier",
                        "@default": "identifier",
                    },
                },
            ],
            [/:=|==|!=|>=|<=|[=><+\-*/%|]/, "operator"],
            [/[{}()\[\]]/, "@brackets"],
        ],
    },
};

let monacoLoadPromise: Promise<MonacoNamespace> | null = null;

function registerRegoLanguage(monaco: MonacoNamespace): void {
    const registeredLanguages = monaco.languages.getLanguages();
    const isAlreadyRegistered = registeredLanguages.some((language) => language.id === REGO_LANGUAGE_ID);

    if (isAlreadyRegistered) {
        return;
    }

    monaco.languages.register({ id: REGO_LANGUAGE_ID });
    monaco.languages.setMonarchTokensProvider(REGO_LANGUAGE_ID, REGO_MONARCH_LANGUAGE);
    monaco.languages.setLanguageConfiguration(REGO_LANGUAGE_ID, {
        comments: { lineComment: "#" },
        brackets: [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"],
        ],
        autoClosingPairs: [
            { open: "{", close: "}" },
            { open: "[", close: "]" },
            { open: "(", close: ")" },
            { open: '"', close: '"' },
        ],
    });
}

function defineEditorTheme(monaco: MonacoNamespace): void {
    monaco.editor.defineTheme(EDITOR_THEME_ID, {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "comment", foreground: "5d6b80", fontStyle: "italic" },
            { token: "keyword", foreground: "a5b4fc" },
            { token: "string", foreground: "7dd3fc" },
            { token: "number", foreground: "fbbf24" },
            { token: "constant", foreground: "f472b6" },
            { token: "type.identifier", foreground: "34d399" },
            { token: "operator", foreground: "93a4bb" },
        ],
        colors: {
            "editor.background": "#0f141b",
            "editor.foreground": "#e6edf6",
            "editorLineNumber.foreground": "#334155",
            "editorLineNumber.activeForeground": "#93a4bb",
            "editor.lineHighlightBackground": "#161d27",
            "editorGutter.background": "#0f141b",
            "editorIndentGuide.background1": "#1e2733",
            "editorWidget.background": "#18202b",
            "editorWidget.border": "#2b3747",
        },
    });
}

export function loadMonaco(): Promise<MonacoNamespace> {
    if (monacoLoadPromise) {
        return monacoLoadPromise;
    }

    monacoLoadPromise = new Promise<MonacoNamespace>((resolveMonaco, rejectMonaco) => {
        const monacoWindow = window as MonacoWindow;
        const loaderScript = document.createElement("script");

        loaderScript.src = MONACO_LOADER_PATH;
        loaderScript.onerror = () => rejectMonaco(new Error("Could not load the Monaco editor assets"));
        loaderScript.onload = () => {
            const amdLoader = monacoWindow.require;

            if (!amdLoader) {
                rejectMonaco(new Error("Monaco loader did not register itself"));

                return;
            }

            // Monaco 0.58's bundle installs its own MonacoEnvironment.getWorker, which
            // resolves its hashed worker files relative to this path. Do not override it.
            amdLoader.config({ paths: { vs: MONACO_VS_PATH } });
            amdLoader([MONACO_EDITOR_MODULE], () => {
                const monaco = monacoWindow.monaco;

                if (!monaco) {
                    rejectMonaco(new Error("Monaco finished loading but did not expose its API"));

                    return;
                }

                registerRegoLanguage(monaco);
                defineEditorTheme(monaco);
                resolveMonaco(monaco);
            });
        };

        document.body.appendChild(loaderScript);
    });

    return monacoLoadPromise;
}
