import { deleteOpaPolicy, installPolicy, listOpaPolicyIds } from "./opa-client.js";
import { readPolicies } from "./policy-files.js";
import type { PolicySyncFailure, PolicySyncResult } from "./types.js";

// Policies that exist in OPA but no longer on disk are left over from earlier runs
// (the renamed "tagging" module, for one), so OPA is trimmed back to match the folder.
async function removeStaleOpaPolicies(diskPolicyIds: string[]): Promise<string[]> {
    const opaPolicyIds = await listOpaPolicyIds();
    const removedIds: string[] = [];

    for (const opaPolicyId of opaPolicyIds) {
        const isOnDisk = diskPolicyIds.includes(opaPolicyId);

        if (!isOnDisk) {
            await deleteOpaPolicy(opaPolicyId);
            removedIds.push(opaPolicyId);
        }
    }

    return removedIds;
}

export async function syncPoliciesToOpa(): Promise<PolicySyncResult> {
    const policies = readPolicies();
    const diskPolicyIds = policies.map((policy) => policy.id);
    const installedIds: string[] = [];
    const failedPolicies: PolicySyncFailure[] = [];

    for (const policy of policies) {
        const installResult = await installPolicy(policy.id, policy.text);

        if (installResult.isInstalled) {
            installedIds.push(policy.id);
        } else {
            failedPolicies.push({
                id: policy.id,
                message: installResult.message,
                compileErrors: installResult.compileErrors,
            });
        }
    }

    const removedIds = await removeStaleOpaPolicies(diskPolicyIds);

    return { installedIds, removedIds, failedPolicies };
}
