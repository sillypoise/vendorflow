import { describe, expect, it } from "vitest";

import {
    empty_request_form,
    request_form_to_draft,
    validate_justification,
    validate_legal_name,
    validate_spend,
    validate_website,
} from "./request_form_model";

describe("vendor request form boundary validation", () => {
    // These checks mirror immediate database boundaries while allowing an incomplete saved draft.
    it("allows empty draft fields and maps them to explicit null values", () => {
        expect(validate_legal_name("")).toBeUndefined();
        expect(validate_website("")).toBeUndefined();
        expect(validate_justification("")).toBeUndefined();
        expect(validate_spend("")).toBeUndefined();
        expect(request_form_to_draft(empty_request_form)).toEqual({
            annual_spend_minor_units: null,
            business_justification: null,
            currency_code: "USD",
            receives_confidential_data: null,
            service_category: null,
            supports_critical_process: null,
            vendor_legal_name: null,
            vendor_website: null,
        });
    });

    it("accepts inclusive text and spend boundaries", () => {
        expect(validate_legal_name("N".repeat(160))).toBeUndefined();
        expect(validate_website("https://vendor.example")).toBeUndefined();
        expect(validate_justification("J".repeat(20))).toBeUndefined();
        expect(validate_justification("J".repeat(2000))).toBeUndefined();
        expect(validate_spend("0")).toBeUndefined();
        expect(validate_spend("1000000000")).toBeUndefined();
    });

    it("rejects immediately out-of-range and malformed values", () => {
        expect(validate_legal_name("N".repeat(161))).toBe("Use 160 characters or fewer.");
        expect(validate_website("http://vendor.example")).toBe("Enter an HTTPS address.");
        expect(validate_justification("J".repeat(19))).toBe("Use at least 20 characters.");
        expect(validate_justification("J".repeat(2001))).toBe("Use 2,000 characters or fewer.");
        expect(validate_spend("-1")).toBe("Enter a whole number of cents.");
        expect(validate_spend("1000000001")).toBe("Enter 1,000,000,000 cents or less.");
    });
});
