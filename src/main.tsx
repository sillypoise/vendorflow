import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { router } from "./router";

const query_client = new QueryClient({
    defaultOptions: {
        mutations: { retry: 0 },
        queries: { retry: 1, staleTime: 15_000 },
    },
});
// The stylesheet import lets Vite include global styles in the application bundle.
// oxlint-disable-next-line import/no-unassigned-import
import "./styles.css";

const root_element = document.querySelector("#root");

if (root_element === null) {
    throw new Error("Application root element is missing.");
}

if (root_element.childElementCount !== 0) {
    throw new Error("Application root element must be empty before mounting.");
}

createRoot(root_element).render(
    <StrictMode>
        <QueryClientProvider client={query_client}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    </StrictMode>,
);
