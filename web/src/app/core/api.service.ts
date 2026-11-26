import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import type { Observable } from "rxjs";
import { AUDIT_URL, HEALTH_URL, POLICIES_URL, POLICY_SYNC_URL, RESOURCES_URL } from "./constants";
import type { AuditResult, HealthStatus, PolicyFile, PolicySyncResult, ResourceSummary, SavePolicyResponse } from "./models";

@Injectable({ providedIn: "root" })
export class ApiService {
    private readonly http = inject(HttpClient);

    getHealth(): Observable<HealthStatus> {
        const health = this.http.get<HealthStatus>(HEALTH_URL);

        return health;
    }

    getPolicies(): Observable<PolicyFile[]> {
        const policies = this.http.get<PolicyFile[]>(POLICIES_URL);

        return policies;
    }

    savePolicy(policyId: string, regoText: string): Observable<SavePolicyResponse> {
        const saveUrl = `${POLICIES_URL}/${policyId}`;
        const saveResponse = this.http.put<SavePolicyResponse>(saveUrl, { text: regoText });

        return saveResponse;
    }

    syncPolicies(): Observable<PolicySyncResult> {
        const syncResult = this.http.post<PolicySyncResult>(POLICY_SYNC_URL, {});

        return syncResult;
    }

    getResources(): Observable<ResourceSummary[]> {
        const resources = this.http.get<ResourceSummary[]>(RESOURCES_URL);

        return resources;
    }

    getResource(resourceId: string): Observable<unknown> {
        const resourceUrl = `${RESOURCES_URL}/${resourceId}`;
        const resource = this.http.get<unknown>(resourceUrl);

        return resource;
    }

    runAudit(resourceId: string): Observable<AuditResult> {
        const auditResult = this.http.post<AuditResult>(AUDIT_URL, { resourceId });

        return auditResult;
    }
}
