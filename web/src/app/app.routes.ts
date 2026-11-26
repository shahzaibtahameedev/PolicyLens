import type { Routes } from "@angular/router";

export const APP_ROUTES: Routes = [
    {
        path: "policies",
        title: "Policies - PolicyLens",
        loadComponent: async () => {
            const module = await import("./features/policies/policies-page");

            return module.PoliciesPage;
        },
    },
    {
        path: "audit",
        title: "Audit - PolicyLens",
        loadComponent: async () => {
            const module = await import("./features/audit/audit-page");

            return module.AuditPage;
        },
    },
    { path: "**", redirectTo: "policies" },
];
