import { serve } from "@hono/node-server";
import { Hono } from "hono";
import {
    HTTP_BAD_GATEWAY,
    HTTP_BAD_REQUEST,
    HTTP_INTERNAL_SERVER_ERROR,
    HTTP_NOT_FOUND,
    INVALID_ID_MESSAGE,
    OPA_UNREACHABLE_MESSAGE,
    SERVER_PORT,
} from "./constants.js";
import { checkOpaHealth, evaluateAudit, installPolicy } from "./opa-client.js";
import { policyFileExists, readPolicies, writePolicyFile } from "./policy-files.js";
import { syncPoliciesToOpa } from "./policy-sync.js";
import { readResource, readResourceSummaries, readResourceSummary, resourceFileExists } from "./resource-files.js";
import type { AuditResult } from "./types.js";
import { isSafeId } from "./validation.js";

interface SavePolicyRequest {
    text?: string;
}

interface RunAuditRequest {
    resourceId?: string;
}

const app = new Hono();

app.get("/api/health", async (context) => {
    const isOpaReachable = await checkOpaHealth();
    const policies = readPolicies();
    const resources = readResourceSummaries();

    return context.json({
        isOpaReachable,
        policyCount: policies.length,
        resourceCount: resources.length,
    });
});

app.get("/api/policies", (context) => {
    const policies = readPolicies();

    return context.json(policies);
});

// OPA is the gatekeeper: the file is only written once the module has compiled there,
// so a rejected edit leaves both the repo and the running policy untouched.
app.put("/api/policies/:id", async (context) => {
    const policyId = context.req.param("id");
    const isSafePolicyId = isSafeId(policyId);

    if (!isSafePolicyId) {
        return context.json({ message: INVALID_ID_MESSAGE }, HTTP_BAD_REQUEST);
    }

    const fileExists = policyFileExists(policyId);

    if (!fileExists) {
        return context.json({ message: `There is no policy named "${policyId}"` }, HTTP_NOT_FOUND);
    }

    const requestBody = await context.req.json<SavePolicyRequest>();
    const regoText = requestBody.text;
    const hasRegoText = typeof regoText === "string";

    if (!hasRegoText) {
        return context.json({ message: "Request body must include the policy text" }, HTTP_BAD_REQUEST);
    }

    const installResult = await installPolicy(policyId, regoText);

    if (!installResult.isInstalled) {
        return context.json(
            { message: installResult.message, errors: installResult.compileErrors },
            HTTP_BAD_REQUEST,
        );
    }

    writePolicyFile(policyId, regoText);

    return context.json({ id: policyId, message: installResult.message });
});

app.post("/api/policies/sync", async (context) => {
    const syncResult = await syncPoliciesToOpa();

    return context.json(syncResult);
});

app.get("/api/resources", (context) => {
    const resources = readResourceSummaries();

    return context.json(resources);
});

app.get("/api/resources/:id", (context) => {
    const resourceId = context.req.param("id");
    const isSafeResourceId = isSafeId(resourceId);

    if (!isSafeResourceId) {
        return context.json({ message: INVALID_ID_MESSAGE }, HTTP_BAD_REQUEST);
    }

    const fileExists = resourceFileExists(resourceId);

    if (!fileExists) {
        return context.json({ message: `There is no resource named "${resourceId}"` }, HTTP_NOT_FOUND);
    }

    const resource = readResource(resourceId);

    return context.json(resource);
});

app.post("/api/audit", async (context) => {
    const requestBody = await context.req.json<RunAuditRequest>();
    const resourceId = requestBody.resourceId;

    if (!resourceId) {
        return context.json({ message: "Request body must include a resourceId" }, HTTP_BAD_REQUEST);
    }

    const isSafeResourceId = isSafeId(resourceId);

    if (!isSafeResourceId) {
        return context.json({ message: INVALID_ID_MESSAGE }, HTTP_BAD_REQUEST);
    }

    const fileExists = resourceFileExists(resourceId);

    if (!fileExists) {
        return context.json({ message: `There is no resource named "${resourceId}"` }, HTTP_NOT_FOUND);
    }

    const summary = readResourceSummary(resourceId);
    const resource = readResource(resourceId);
    const evaluation = await evaluateAudit(resource);
    const auditResult: AuditResult = {
        resourceId,
        resourceName: summary.name,
        resourceType: summary.type,
        isCompliant: evaluation.isCompliant,
        violations: evaluation.violations,
        evaluationMs: evaluation.evaluationMs,
        evaluatedAt: new Date().toISOString(),
    };

    return context.json(auditResult);
});

app.onError((error, context) => {
    const isNetworkFailure = error instanceof TypeError;

    if (isNetworkFailure) {
        return context.json({ message: OPA_UNREACHABLE_MESSAGE }, HTTP_BAD_GATEWAY);
    }

    console.error(error);

    return context.json({ message: error.message }, HTTP_INTERNAL_SERVER_ERROR);
});

// A missing OPA must not stop the API from booting, otherwise the UI cannot even
// load to tell you that OPA is down.
async function syncPoliciesOnBoot(): Promise<void> {
    try {
        const syncResult = await syncPoliciesToOpa();
        const installedList = syncResult.installedIds.join(", ");

        console.log(`Installed in OPA: ${installedList}`);

        const hasRemovedPolicies = syncResult.removedIds.length > 0;

        if (hasRemovedPolicies) {
            const removedList = syncResult.removedIds.join(", ");

            console.log(`Removed from OPA (no longer on disk): ${removedList}`);
        }

        for (const failure of syncResult.failedPolicies) {
            console.error(`Policy "${failure.id}" did not compile: ${failure.message}`);
        }
    } catch {
        console.warn(OPA_UNREACHABLE_MESSAGE);
        console.warn("The API is up, but policy saves and audits will fail until OPA is running.");
    }
}

async function startServer(): Promise<void> {
    await syncPoliciesOnBoot();

    serve({ fetch: app.fetch, port: SERVER_PORT });

    console.log(`PolicyLens API listening on http://localhost:${SERVER_PORT}`);
}

await startServer();
