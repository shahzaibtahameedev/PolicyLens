export const TOAST_DURATION_MS = 2800;
export const OPA_ENDPOINT_LABEL = "localhost:8181";

export const MONACO_BASE_PATH = "assets/monaco";
export const MONACO_VS_PATH = `${MONACO_BASE_PATH}/vs`;
export const MONACO_LOADER_PATH = `${MONACO_VS_PATH}/loader.js`;
export const MONACO_EDITOR_MODULE = "vs/editor/editor.main";
export const REGO_LANGUAGE_ID = "rego";
export const EDITOR_THEME_ID = "policylens-fluent-dark";
export const EDITOR_MARKER_OWNER = "opa";
export const EDITOR_FONT_SIZE = 14;
export const EDITOR_LINE_HEIGHT = 22;
export const EDITOR_TAB_SIZE = 4;
export const EDITOR_PADDING = 12;
export const EDITOR_FONT_FAMILY = 'Consolas, "Cascadia Mono", "Courier New", monospace';

export const SEVERITY_HIGH = "High" as const;
export const SEVERITY_MEDIUM = "Medium" as const;
export const SEVERITY_LOW = "Low" as const;
export const SEVERITY_ORDER = [SEVERITY_HIGH, SEVERITY_MEDIUM, SEVERITY_LOW] as const;

export const AUDIT_STEP_TYPE = 1;
export const AUDIT_STEP_RESOURCES = 2;
export const AUDIT_STEP_REVIEW = 3;

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const AUDIT_RUN_STEP_DELAY_MS = 450;

export const RELOAD_OPA_SUCCESS_MESSAGE = "Policies reloaded from OPA at localhost:8181";
export const PDF_DOWNLOAD_MESSAGE = "Downloaded policylens-storage-audit-2026-11-26.pdf";
export const COPY_SUCCESS_MESSAGE = "Copied to clipboard";
