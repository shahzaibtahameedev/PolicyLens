import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { JSON_EXTENSION, RESOURCES_DIR, UNKNOWN_FIELD_VALUE } from "./constants.js";
import type { ResourceSummary } from "./types.js";

interface AzureResource {
    name?: string;
    type?: string;
    location?: string;
    tags?: Record<string, string>;
}

function buildResourceFilePath(resourceId: string): string {
    const resourceFilePath = join(RESOURCES_DIR, `${resourceId}${JSON_EXTENSION}`);

    return resourceFilePath;
}

export function readResource(resourceId: string): unknown {
    const resourceFilePath = buildResourceFilePath(resourceId);
    const resourceText = readFileSync(resourceFilePath, "utf8");
    const resource = JSON.parse(resourceText);

    return resource;
}

export function resourceFileExists(resourceId: string): boolean {
    const resourceFilePath = buildResourceFilePath(resourceId);
    const fileExists = existsSync(resourceFilePath);

    return fileExists;
}

export function readResourceSummary(resourceId: string): ResourceSummary {
    const resource = readResource(resourceId);
    const azureResource = resource as AzureResource;
    const resourceName = azureResource.name;
    const resourceType = azureResource.type;
    const resourceLocation = azureResource.location;
    const resourceTags = azureResource.tags;
    const summary: ResourceSummary = {
        id: resourceId,
        fileName: `${resourceId}${JSON_EXTENSION}`,
        name: resourceName ? resourceName : resourceId,
        type: resourceType ? resourceType : UNKNOWN_FIELD_VALUE,
        location: resourceLocation ? resourceLocation : UNKNOWN_FIELD_VALUE,
        tags: resourceTags ? resourceTags : {},
    };

    return summary;
}

// The audit list is driven by the file name: resources/storage.json is shown as "storage".
export function readResourceSummaries(): ResourceSummary[] {
    const directoryEntries = readdirSync(RESOURCES_DIR);
    const resourceFileNames = directoryEntries.filter((fileName) => fileName.endsWith(JSON_EXTENSION));
    const summaries: ResourceSummary[] = [];

    for (const fileName of resourceFileNames) {
        const resourceId = fileName.slice(0, -JSON_EXTENSION.length);
        const summary = readResourceSummary(resourceId);

        summaries.push(summary);
    }

    return summaries;
}
