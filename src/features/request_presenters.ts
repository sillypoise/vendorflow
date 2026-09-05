import type { RequestState, VendorRequest } from "../lib/vendor_requests";

const state_labels: Record<RequestState, string> = {
    approved: "Approved",
    changes_requested: "Changes requested",
    draft: "Draft",
    in_review: "In review",
    rejected: "Rejected",
    submitted: "Submitted",
};

export function request_is_complete(request: VendorRequest): boolean {
    if (request.vendor_legal_name === null) return false;
    if (request.vendor_website === null) return false;
    if (request.service_category === null) return false;
    if (request.business_justification === null) return false;
    if (request.annual_spend_minor_units === null) return false;
    if (request.currency_code === null) return false;
    if (request.receives_confidential_data === null) return false;
    return request.supports_critical_process !== null;
}

export function request_state_label(state: RequestState): string {
    return state_labels[state];
}

export function format_timestamp(timestamp: string): string {
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(timestamp));
}

export function format_spend(minor_units: number | null, currency_code: string | null): string {
    if (minor_units === null || currency_code === null) {
        return "Not provided";
    }
    return new Intl.NumberFormat("en-US", {
        currency: currency_code,
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
        style: "currency",
    }).format(minor_units / 100);
}
