import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { router } from "./router";
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
        <RouterProvider router={router} />
    </StrictMode>,
);
