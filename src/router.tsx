import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { lazy } from "react";

import { HomePage, NotFoundPage, RootLayout } from "./app";

const AuthenticatedLayout = lazy(() =>
    import("./features/authenticated_layout").then((module) => ({
        default: module.AuthenticatedLayout,
    })),
);
const RequestDashboardPage = lazy(() =>
    import("./features/request_dashboard").then((module) => ({
        default: module.RequestDashboardPage,
    })),
);
const RequestDetailPage = lazy(() =>
    import("./features/request_detail").then((module) => ({ default: module.RequestDetailPage })),
);
const EditRequestPage = lazy(() =>
    import("./features/request_form").then((module) => ({ default: module.EditRequestPage })),
);
const NewRequestPage = lazy(() =>
    import("./features/request_form").then((module) => ({ default: module.NewRequestPage })),
);

const root_route = createRootRoute({
    component: RootLayout,
    notFoundComponent: NotFoundPage,
});

const index_route = createRoute({
    getParentRoute: () => root_route,
    path: "/",
    component: HomePage,
});

const authenticated_route = createRoute({
    getParentRoute: () => root_route,
    id: "_authenticated",
    component: AuthenticatedLayout,
});

const requests_route = createRoute({
    getParentRoute: () => authenticated_route,
    path: "/requests",
    component: RequestDashboardPage,
});

const new_request_route = createRoute({
    getParentRoute: () => authenticated_route,
    path: "/requests/new",
    component: NewRequestPage,
});

const request_detail_route = createRoute({
    getParentRoute: () => authenticated_route,
    path: "/requests/$requestId",
    component: RequestDetailPage,
});

const edit_request_route = createRoute({
    getParentRoute: () => authenticated_route,
    path: "/requests/$requestId/edit",
    component: EditRequestPage,
});

const route_tree = root_route.addChildren([
    index_route,
    authenticated_route.addChildren([
        requests_route,
        new_request_route,
        request_detail_route,
        edit_request_route,
    ]),
]);

export const router = createRouter({
    routeTree: route_tree,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}
