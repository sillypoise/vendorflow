import type { DraftInput, VendorRequest } from "../lib/vendor_requests";

export type RequestFormValues = {
    annual_spend_minor_units: string;
    business_justification: string;
    currency_code: string;
    receives_confidential_data: string;
    service_category: string;
    supports_critical_process: string;
    vendor_legal_name: string;
    vendor_website: string;
};

export const empty_request_form: RequestFormValues = {
    annual_spend_minor_units: "",
    business_justification: "",
    currency_code: "USD",
    receives_confidential_data: "",
    service_category: "",
    supports_critical_process: "",
    vendor_legal_name: "",
    vendor_website: "",
};

export function validate_legal_name(value: string): string | undefined {
    if (value.length === 0) return undefined;
    if (value !== value.trim()) return "Remove spaces from the beginning or end.";
    if (value.length > 160) return "Use 160 characters or fewer.";
    return undefined;
}

export function validate_website(value: string): string | undefined {
    if (value.length === 0) return undefined;
    if (value.length > 2048) return "Use 2,048 characters or fewer.";
    try {
        const url = new URL(value);
        if (url.protocol !== "https:") return "Enter an HTTPS address.";
        if (url.hostname.length === 0) return "Enter a complete website address.";
    } catch {
        return "Enter a complete HTTPS website address.";
    }
    return undefined;
}

export function validate_justification(value: string): string | undefined {
    if (value.length === 0) return undefined;
    if (value !== value.trim()) return "Remove spaces from the beginning or end.";
    if (value.length < 20) return "Use at least 20 characters.";
    if (value.length > 2000) return "Use 2,000 characters or fewer.";
    return undefined;
}

export function validate_spend(value: string): string | undefined {
    if (value.length === 0) return undefined;
    if (!/^\d+$/u.test(value)) return "Enter a whole number of cents.";
    const minor_units = Number(value);
    if (!Number.isSafeInteger(minor_units)) return "Enter a smaller whole number.";
    if (minor_units > 1_000_000_000) return "Enter 1,000,000,000 cents or less.";
    return undefined;
}

export function request_form_to_draft(values: RequestFormValues): DraftInput {
    const spend = values.annual_spend_minor_units;
    return {
        annual_spend_minor_units: spend === "" ? null : Number(spend),
        business_justification: values.business_justification || null,
        currency_code: values.currency_code || null,
        receives_confidential_data:
            values.receives_confidential_data === ""
                ? null
                : values.receives_confidential_data === "yes",
        service_category: values.service_category || null,
        supports_critical_process:
            values.supports_critical_process === ""
                ? null
                : values.supports_critical_process === "yes",
        vendor_legal_name: values.vendor_legal_name || null,
        vendor_website: values.vendor_website || null,
    };
}

export function request_to_form(request: VendorRequest): RequestFormValues {
    return {
        annual_spend_minor_units: request.annual_spend_minor_units?.toString() ?? "",
        business_justification: request.business_justification ?? "",
        currency_code: request.currency_code ?? "USD",
        receives_confidential_data: format_boolean_input(request.receives_confidential_data),
        service_category: request.service_category ?? "",
        supports_critical_process: format_boolean_input(request.supports_critical_process),
        vendor_legal_name: request.vendor_legal_name ?? "",
        vendor_website: request.vendor_website ?? "",
    };
}

function format_boolean_input(value: boolean | null): string {
    if (value === null) return "";
    return value ? "yes" : "no";
}
