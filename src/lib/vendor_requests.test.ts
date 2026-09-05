import { describe, expect, it } from "vitest";

import { WorkflowError, workflow_error_message } from "./vendor_requests";

describe("workflow boundary error presentation", () => {
    // Stable database codes become bounded user guidance without exposing backend details.
    it("gives stale revisions an explicit recovery action", () => {
        expect(workflow_error_message(new WorkflowError("STALE_REVISION"))).toMatch(/Refresh/u);
    });

    it("does not expose unexpected error details", () => {
        const internal_error = new Error("password=unsafe database stack trace");
        const message = workflow_error_message(internal_error);

        expect(message).toBe("VendorFlow could not complete the request. Try again.");
        expect(message).not.toContain("password");
        expect(message).not.toContain("database");
    });
});
