import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = resolve(SOURCE_DIR, "..", "..");
export const POLICIES_DIR = join(PROJECT_ROOT, "policies");
export const RESOURCES_DIR = join(PROJECT_ROOT, "resources");
export const DEFAULT_RESOURCE_PATH = join(RESOURCES_DIR, "storage.json");
export const LOG_FILE_PATH = join(PROJECT_ROOT, "server", "log.txt");

export const OPA_BASE_URL = "http://localhost:8181";
export const OPA_HEALTH_URL = `${OPA_BASE_URL}/health`;
export const OPA_POLICIES_URL = `${OPA_BASE_URL}/v1/policies`;
export const OPA_AUDIT_URL = `${OPA_BASE_URL}/v1/data/azure/audit`;
export const OPA_AUDIT_METRICS_URL = `${OPA_AUDIT_URL}?metrics=true`;
export const OPA_EVALUATION_TIMER_KEY = "timer_rego_query_eval_ns";

export const SERVER_PORT = 3000;

export const REGO_EXTENSION = ".rego";
export const TEST_FILE_SUFFIX = "_test.rego";
export const JSON_EXTENSION = ".json";

export const REGO_CONTENT_TYPE = "text/plain";
export const JSON_CONTENT_TYPE = "application/json";

export const HTTP_BAD_REQUEST = 400;
export const HTTP_NOT_FOUND = 404;
export const HTTP_INTERNAL_SERVER_ERROR = 500;
export const HTTP_BAD_GATEWAY = 502;

export const JSON_INDENT = 2;
export const SEPARATOR_LINE = "-".repeat(60);
export const NANOSECONDS_PER_MILLISECOND = 1_000_000;
export const UNKNOWN_FIELD_VALUE = "unknown";

// Ids come straight from the URL and are turned into file paths, so anything
// outside this set (dots and slashes above all) has to be refused.
export const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const OPA_UNREACHABLE_MESSAGE = `Could not reach OPA at ${OPA_BASE_URL} - is it running?`;
export const INVALID_ID_MESSAGE = "Id may only contain letters, numbers, dashes and underscores";
