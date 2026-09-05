import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type Membership = Database["public"]["Tables"]["organization_memberships"]["Row"];
export type VendorRequest = Database["public"]["Tables"]["vendor_requests"]["Row"];
export type AuditEvent = Database["public"]["Tables"]["vendor_request_audit_events"]["Row"];
export type RequestState = Database["public"]["Enums"]["vendor_request_state"];
export type DraftInput = Database["public"]["CompositeTypes"]["vendor_request_draft_input"];
export type MembershipRole = Database["public"]["Enums"]["membership_role"];

type DatabaseClient = SupabaseClient<Database>;

const workflow_error_codes = [
    "AUTHENTICATION_REQUIRED",
    "PERMISSION_DENIED",
    "REQUEST_NOT_FOUND",
    "VALIDATION_FAILED",
    "INVALID_TRANSITION",
    "STALE_REVISION",
    "DEPENDENCY_UNAVAILABLE",
    "INTERNAL_ERROR",
] as const;

export type WorkflowErrorCode = (typeof workflow_error_codes)[number];

export class WorkflowError extends Error {
    readonly code: WorkflowErrorCode;

    constructor(code: WorkflowErrorCode) {
        super(code);
        this.name = "WorkflowError";
        this.code = code;
    }
}

function throw_database_error(error: PostgrestError | null): void {
    if (error === null) {
        return;
    }

    for (const code of workflow_error_codes) {
        if (error.message === code) {
            throw new WorkflowError(code);
        }
    }
    throw new WorkflowError("INTERNAL_ERROR");
}

export function workflow_error_message(error: unknown): string {
    const code = error instanceof WorkflowError ? error.code : "INTERNAL_ERROR";
    switch (code) {
        case "AUTHENTICATION_REQUIRED":
            return "Your session has expired. Sign in again to continue.";
        case "PERMISSION_DENIED":
            return "Your role does not permit this action.";
        case "REQUEST_NOT_FOUND":
            return "This request is unavailable or no longer exists.";
        case "VALIDATION_FAILED":
            return "Check the highlighted information and try again.";
        case "INVALID_TRANSITION":
            return "The request changed state. Refresh before trying again.";
        case "STALE_REVISION":
            return "A newer version exists. Refresh before making another change.";
        case "DEPENDENCY_UNAVAILABLE":
            return "The workflow service is temporarily unavailable. Try again shortly.";
        case "INTERNAL_ERROR":
            return "VendorFlow could not complete the request. Try again.";
        default:
            throw new Error("Unrecognized workflow error code.");
    }
}

export async function get_membership(client: DatabaseClient, user_id: string): Promise<Membership> {
    const { data, error } = await client
        .from("organization_memberships")
        .select("*")
        .eq("user_id", user_id)
        .eq("active", true)
        .maybeSingle();
    throw_database_error(error);
    if (data === null) {
        throw new WorkflowError("PERMISSION_DENIED");
    }
    return data;
}

export async function get_organization_name(
    client: DatabaseClient,
    organization_id: string,
): Promise<string> {
    const { data, error } = await client
        .from("organizations")
        .select("name")
        .eq("id", organization_id)
        .maybeSingle();
    throw_database_error(error);
    if (data === null) {
        throw new WorkflowError("PERMISSION_DENIED");
    }
    return data.name;
}

export async function list_vendor_requests(
    client: DatabaseClient,
    state: RequestState | "all",
): Promise<VendorRequest[]> {
    let query = client
        .from("vendor_requests")
        .select("*")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(100);
    if (state !== "all") {
        query = query.eq("state", state);
    }
    const { data, error } = await query;
    throw_database_error(error);
    return data ?? [];
}

export async function get_vendor_request(
    client: DatabaseClient,
    request_id: string,
): Promise<VendorRequest> {
    const { data, error } = await client
        .from("vendor_requests")
        .select("*")
        .eq("id", request_id)
        .maybeSingle();
    throw_database_error(error);
    if (data === null) {
        throw new WorkflowError("REQUEST_NOT_FOUND");
    }
    return data;
}

export async function list_audit_events(
    client: DatabaseClient,
    request_id: string,
): Promise<AuditEvent[]> {
    const { data, error } = await client
        .from("vendor_request_audit_events")
        .select("*")
        .eq("request_id", request_id)
        .order("created_at", { ascending: true, nullsFirst: false })
        .limit(100);
    throw_database_error(error);
    return data ?? [];
}

export async function list_reviewers(client: DatabaseClient): Promise<Membership[]> {
    const { data, error } = await client
        .from("organization_memberships")
        .select("*")
        .eq("role", "reviewer")
        .eq("active", true)
        .order("display_name", { ascending: true, nullsFirst: false })
        .limit(100);
    throw_database_error(error);
    return data ?? [];
}

export async function create_vendor_request(
    client: DatabaseClient,
    draft: DraftInput,
): Promise<VendorRequest> {
    const { data, error } = await client.rpc("create_vendor_request", { p_draft: draft });
    throw_database_error(error);
    if (data === null) {
        throw new WorkflowError("INTERNAL_ERROR");
    }
    return data;
}

export async function update_vendor_request(
    client: DatabaseClient,
    request: VendorRequest,
    draft: DraftInput,
): Promise<VendorRequest> {
    const { data, error } = await client.rpc("update_vendor_request", {
        p_draft: draft,
        p_expected_revision: request.revision,
        p_request_id: request.id,
    });
    throw_database_error(error);
    if (data === null) {
        throw new WorkflowError("INTERNAL_ERROR");
    }
    return data;
}

export async function submit_vendor_request(
    client: DatabaseClient,
    request: VendorRequest,
): Promise<void> {
    const { error } = await client.rpc("submit_vendor_request", {
        p_expected_revision: request.revision,
        p_request_id: request.id,
    });
    throw_database_error(error);
}

export async function assign_vendor_request(
    client: DatabaseClient,
    request: VendorRequest,
    reviewer_user_id: string,
): Promise<void> {
    const { error } = await client.rpc("assign_vendor_request", {
        p_expected_revision: request.revision,
        p_request_id: request.id,
        p_reviewer_user_id: reviewer_user_id,
    });
    throw_database_error(error);
}

export async function review_vendor_request(
    client: DatabaseClient,
    request: VendorRequest,
    decision: "approve" | "reject" | "request_changes",
    reason: string | null,
): Promise<void> {
    const input = {
        p_decision: decision,
        p_expected_revision: request.revision,
        p_request_id: request.id,
        ...(reason === null ? {} : { p_reason: reason }),
    };
    const { error } = await client.rpc("review_vendor_request", input);
    throw_database_error(error);
}
