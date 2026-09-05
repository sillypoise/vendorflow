import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { get_supabase_client } from "../lib/supabase";
import {
    list_vendor_requests,
    workflow_error_message,
    type MembershipRole,
    type RequestState,
    type VendorRequest,
} from "../lib/vendor_requests";
import { useApplicationContext } from "./authenticated_layout";
import { format_spend, format_timestamp, request_state_label } from "./request_presenters";

const state_filters: Array<RequestState | "all"> = [
    "all",
    "draft",
    "submitted",
    "in_review",
    "changes_requested",
    "approved",
    "rejected",
];
const role_summaries: Record<MembershipRole, string> = {
    administrator: "Assign submitted requests and follow every decision in your organization.",
    requester: "Create vendor requests, follow decisions, and respond to requested changes.",
    reviewer: "Review the requests assigned to you and record a clear decision.",
};

function parse_state_filter(value: string): RequestState | "all" {
    for (const state of state_filters) {
        if (state === value) return state;
    }
    return "all";
}

function RequestCard({ request }: { request: VendorRequest }) {
    return (
        <li>
            <Link
                className="request-card"
                params={{ requestId: request.id }}
                to="/requests/$requestId"
            >
                <div className="request-card-heading">
                    <div>
                        <span className={`status-badge status-${request.state}`}>
                            {request_state_label(request.state)}
                        </span>
                        <h2>{request.vendor_legal_name ?? "Untitled vendor"}</h2>
                    </div>
                    <span aria-label={`Revision ${request.revision}`} className="revision-label">
                        r{request.revision}
                    </span>
                </div>
                <dl className="request-card-facts">
                    <div>
                        <dt>Category</dt>
                        <dd>{request.service_category?.replaceAll("_", " ") ?? "Not provided"}</dd>
                    </div>
                    <div>
                        <dt>Annual spend</dt>
                        <dd>
                            {format_spend(request.annual_spend_minor_units, request.currency_code)}
                        </dd>
                    </div>
                    <div>
                        <dt>Updated</dt>
                        <dd>{format_timestamp(request.updated_at)}</dd>
                    </div>
                </dl>
            </Link>
        </li>
    );
}

function StateFilter({
    state,
    set_state,
}: {
    state: RequestState | "all";
    set_state: (state: RequestState | "all") => void;
}) {
    return (
        <label>
            Status
            <select
                onChange={(event) => {
                    set_state(parse_state_filter(event.target.value));
                }}
                value={state}
            >
                {state_filters.map((option) => (
                    <option key={option} value={option}>
                        {option === "all" ? "All statuses" : request_state_label(option)}
                    </option>
                ))}
            </select>
        </label>
    );
}

function RequestList({ state_filter }: { state_filter: RequestState | "all" }) {
    const requests_query = useQuery({
        queryKey: ["vendor_requests", state_filter],
        queryFn: () => list_vendor_requests(get_supabase_client(), state_filter),
    });
    if (requests_query.isPending) return <output>Loading requests…</output>;
    if (requests_query.isError) {
        return (
            <div className="error-banner" role="alert">
                <p>{workflow_error_message(requests_query.error)}</p>
                <button
                    onClick={() => {
                        void requests_query.refetch();
                    }}
                    type="button"
                >
                    Retry
                </button>
            </div>
        );
    }
    if (requests_query.data.length === 0) {
        return (
            <div className="empty-state">
                <h2>No requests match this view.</h2>
                <p>Choose another status or create the first vendor request.</p>
            </div>
        );
    }
    return (
        <ul className="request-grid">
            {requests_query.data.map((request) => (
                <RequestCard key={request.id} request={request} />
            ))}
        </ul>
    );
}

export function RequestDashboardPage() {
    const { membership, organization_name } = useApplicationContext();
    const [state_filter, set_state_filter] = useState<RequestState | "all">("all");
    return (
        <main className="workspace-main">
            <header className="page-heading dashboard-heading">
                <div>
                    <p className="section-kicker">{organization_name}</p>
                    <h1>Vendor requests</h1>
                    <p>{role_summaries[membership.role]}</p>
                </div>
                {membership.role === "requester" ? (
                    <Link className="primary-button" to="/requests/new">
                        New request
                    </Link>
                ) : null}
            </header>
            <section aria-labelledby="request-list-heading">
                <div className="list-toolbar">
                    <h2 id="request-list-heading">Current work</h2>
                    <StateFilter state={state_filter} set_state={set_state_filter} />
                </div>
                <RequestList state_filter={state_filter} />
            </section>
        </main>
    );
}
