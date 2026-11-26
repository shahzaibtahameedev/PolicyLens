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
            { token: "comment", foreground: "6a9955" },
            { token: "keyword", foreground: "569cd6" },
            { token: "string", foreground: "ce9178" },
            { token: "number", foreground: "b5cea8" },
            { token: "constant", foreground: "569cd6" },
            { token: "type.identifier", foreground: "dcdcaa" },
            { token: "operator", foreground: "d6d6d6" },
        ],
        colors: {
            "editor.background": "#1f1f1f",
            "editor.foreground": "#d6d6d6",
            "editorLineNumber.foreground": "#858585",
            "editorLineNumber.activeForeground": "#ffffff",
            "editor.lineHighlightBackground": "#292929",
            "editorGutter.background": "#1f1f1f",
            "editorIndentGuide.background1": "#333333",
            "editorWidget.background": "#252526",
            "editorWidget.border": "#525252",
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
