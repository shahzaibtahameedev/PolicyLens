export const API_BASE_URL = "/api";
export const HEALTH_URL = `${API_BASE_URL}/health`;
export const POLICIES_URL = `${API_BASE_URL}/policies`;
export const POLICY_SYNC_URL = `${API_BASE_URL}/policies/sync`;
export const RESOURCES_URL = `${API_BASE_URL}/resources`;
export const AUDIT_URL = `${API_BASE_URL}/audit`;

export const HEALTH_POLL_INTERVAL_MS = 15000;
export const TOAST_DURATION_MS = 2800;
export const JSON_INDENT = 2;

export const MONACO_BASE_PATH = "assets/monaco";
export const MONACO_VS_PATH = `${MONACO_BASE_PATH}/vs`;
export const MONACO_LOADER_PATH = `${MONACO_VS_PATH}/loader.js`;
export const MONACO_EDITOR_MODULE = "vs/editor/editor.main";
export const REGO_LANGUAGE_ID = "rego";
export const JSON_LANGUAGE_ID = "json";
export const EDITOR_THEME_ID = "policylens-dark";
export const EDITOR_MARKER_OWNER = "opa";
export const EDITOR_FONT_SIZE = 13;
export const EDITOR_LINE_HEIGHT = 21;
export const EDITOR_TAB_SIZE = 4;
export const EDITOR_PADDING = 16;
export const EDITOR_FONT_FAMILY = '"JetBrains Mono", ui-monospace, monospace';

// Each policy contributes rules to one shared violations set, so counting the
// rule heads is how the sidebar shows what is inside a file.
export const VIOLATION_RULE_MARKER = "violations contains";

export const SEVERITY_HIGH = "High";
export const SEVERITY_MEDIUM = "Medium";
export const SEVERITY_LOW = "Low";
export const SEVERITY_ORDER = [SEVERITY_HIGH, SEVERITY_MEDIUM, SEVERITY_LOW];
export const UNRANKED_SEVERITY_ORDER = SEVERITY_ORDER.length;

export const SEVERITY_BADGE_CLASSES: Record<string, string> = {
    [SEVERITY_HIGH]: "bg-high/15 text-high ring-high/30",
    [SEVERITY_MEDIUM]: "bg-medium/15 text-medium ring-medium/30",
    [SEVERITY_LOW]: "bg-low/15 text-low ring-low/30",
};

export const FALLBACK_BADGE_CLASSES = "bg-edge text-ink-dim ring-edge-strong";

export const SEVERITY_BAR_CLASSES: Record<string, string> = {
    [SEVERITY_HIGH]: "bg-high",
    [SEVERITY_MEDIUM]: "bg-medium",
    [SEVERITY_LOW]: "bg-low",
};

export const FALLBACK_BAR_CLASSES = "bg-edge-strong";

export const SAVE_SUCCESS_MESSAGE = "Saved to disk and installed in OPA";
export const SYNC_SUCCESS_MESSAGE = "Policies re-synced to OPA";
export const GENERIC_ERROR_MESSAGE = "Something went wrong talking to the PolicyLens API";
export const COMPILE_REJECTED_NOTE =
    "OPA rejected this module, so nothing was written to disk and the previously installed version is still running.";

export const DISCARD_CHANGES_PROMPT = "You have unsaved changes to this policy. Discard them?";
export const NO_POLICY_SELECTED_MESSAGE = "Select a policy to view its Rego";
export const NO_RESOURCE_SELECTED_MESSAGE = "Select a resource to inspect and audit it";
export const COMPLIANT_MESSAGE = "No violations. This resource satisfies every installed policy.";
