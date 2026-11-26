import type { CanDeactivateFn, Routes } from "@angular/router";
import type { PoliciesPage } from "./pages/policies/policies-page";

function resolveDestinationLabel(nextUrl: string): string {
    if (nextUrl.startsWith("/dashboard")) {
        return "Dashboard";
    }

    if (nextUrl.startsWith("/audit")) {
        return "Audit";
    }

    return "another page";
}

const confirmUnsavedPolicyChanges: CanDeactivateFn<PoliciesPage> = (component, _currentRoute, _currentState, nextState) => {
    const destination = resolveDestinationLabel(nextState.url);

    return component.canLeavePage(destination);
};

export const APP_ROUTES: Routes = [
    {
        path: "dashboard",
        title: "Dashboard - PolicyLens",
        loadComponent: async () => {
            const module = await import("./pages/dashboard/dashboard-page");

            return module.DashboardPage;
        },
    },
    {
        path: "audit",
        title: "Audit - PolicyLens",
        loadComponent: async () => {
            const module = await import("./pages/audit/audit-page");

            return module.AuditPage;
        },
    },
    {
        path: "policies",
        title: "Policies - PolicyLens",
        canDeactivate: [confirmUnsavedPolicyChanges],
        loadComponent: async () => {
            const module = await import("./pages/policies/policies-page");

            return module.PoliciesPage;
        },
    },
    { path: "**", redirectTo: "dashboard" },
];
