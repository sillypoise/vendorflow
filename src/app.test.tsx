import { render, screen } from "@testing-library/react";
import { RouterProvider } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { HomePage } from "./app";
import { router } from "./router";

describe("VendorFlow foundation pages", () => {
    // Direct rendering checks the core message; router rendering checks unknown-path recovery.
    it("states the product purpose and current implementation boundary", () => {
        render(<HomePage />);

        expect(
            screen.getByRole("heading", {
                name: "Every vendor decision has an owner and a history.",
            }),
        ).toBeVisible();
        expect(screen.getByText("Foundation in progress")).toBeVisible();
        expect(screen.getByText(/permission-aware process/u)).toBeVisible();
    });

    it("offers safe recovery for an unknown route", async () => {
        router.history.push("/outside-workflow");
        await router.load();
        render(<RouterProvider router={router} />);

        expect(
            screen.getByRole("heading", { name: "This page is outside the workflow." }),
        ).toBeVisible();
        expect(screen.getByRole("link", { name: "Return to VendorFlow" })).toHaveAttribute(
            "href",
            "/",
        );
    });
});
