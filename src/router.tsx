import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import { HomePage, NotFoundPage, RootLayout } from "./app";

const root_route = createRootRoute({
    component: RootLayout,
    notFoundComponent: NotFoundPage,
});

const index_route = createRoute({
    getParentRoute: () => root_route,
    path: "/",
    component: HomePage,
});

const route_tree = root_route.addChildren([index_route]);

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
