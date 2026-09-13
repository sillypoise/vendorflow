import { cleanup, render, screen } from "@testing-library/react";
import { RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";

import { router } from "./router";

afterEach(cleanup);

describe("VendorFlow application pages", () => {
    // Router rendering checks both the workflow entry point and unknown-route recovery.
    it("states the product purpose and opens the implemented workflow", async () => {
        router.history.push("/");
        await router.load();
        render(<RouterProvider router={router} />);

        expect(
            screen.getByRole("heading", {
                name: "Every vendor decision has an owner and a history.",
            }),
        ).toBeVisible();
        expect(screen.getByText("Illustrative example")).toBeVisible();
        expect(
            screen.getByText("Other paths include requested changes or rejection."),
        ).toBeVisible();
        expect(screen.getByText("Independent product concept · Sample data")).toBeVisible();
        expect(screen.getByRole("link", { name: "Open workflow preview" })).toHaveAttribute(
            "href",
            "/requests",
        );
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
