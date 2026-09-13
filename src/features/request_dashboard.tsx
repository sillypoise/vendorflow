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
                    <span className="vendor-mark" aria-hidden="true">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <path d="M5 21V4h10v17M15 10h4v11M3 21h18M9 8h2M9 12h2M9 16h2" />
                        </svg>
                    </span>
                    <div>
                        <h3>{request.vendor_legal_name ?? "Untitled vendor"}</h3>
                        <p>{request.service_category?.replaceAll("_", " ") ?? "Not provided"}</p>
                    </div>
                </div>
                <div className="request-card-status">
                    <span className={`status-badge status-${request.state}`}>
                        {request_state_label(request.state)}
                    </span>
                    <span aria-label={`Revision ${request.revision}`} className="revision-label">
                        r{request.revision}
                        <span aria-hidden="true"> →</span>
                    </span>
                </div>
                <dl className="request-card-facts">
                    <div>
                        <dt>Annual spend</dt>
                        <dd className="spend-value">
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

function RequestPages({
    page,
    count,
    set_page,
}: {
    page: number;
    count: number;
    set_page: (page: number) => void;
}) {
    return (
        <nav className="pagination" aria-label="Request pages">
            <button
                disabled={page === 0}
                type="button"
                onClick={() => {
                    set_page(page - 1);
                }}
            >
                Previous page
            </button>
            <span>Page {page + 1}</span>
            <button
                disabled={page === 4 || count < 20}
                type="button"
                onClick={() => {
                    set_page(page + 1);
                }}
            >
                Next page
            </button>
        </nav>
    );
}

function RequestRows({ requests }: { requests: VendorRequest[] }) {
    return (
        <>
            {requests.length > 0 ? (
                <div className="ledger-columns" aria-hidden="true">
                    <span>Vendor / category</span>
                    <span>Status</span>
                    <div className="ledger-facts-heading">
                        <span>Annual spend</span>
                        <span>Updated</span>
                    </div>
                    <span>Rev.</span>
                </div>
            ) : null}
            <ul className="request-grid">
                {requests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                ))}
            </ul>
        </>
    );
}

function RequestList({ state_filter }: { state_filter: RequestState | "all" }) {
    const [page, set_page] = useState(0);
    const requests_query = useQuery({
        queryKey: ["vendor_requests", state_filter, page],
        queryFn: () => list_vendor_requests(get_supabase_client(), state_filter, page),
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
    return (
        <>
            {requests_query.data.length === 0 ? (
                <div className="empty-state">
                    <h2>No requests match this view.</h2>
                    <p>Choose another status or page.</p>
                </div>
            ) : null}
            <RequestRows requests={requests_query.data} />
            <div className="ledger-footer">
                <p className="results-summary" aria-live="polite">
                    {requests_query.data.length}{" "}
                    {requests_query.data.length === 1 ? "request" : "requests"}
                    {" on this page"}
                </p>
                <RequestPages page={page} count={requests_query.data.length} set_page={set_page} />
            </div>
        </>
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
            <section className="request-ledger" aria-labelledby="request-list-heading">
                <div className="list-toolbar">
                    <h2 id="request-list-heading">Current work</h2>
                    <StateFilter state={state_filter} set_state={set_state_filter} />
                </div>
                <RequestList key={state_filter} state_filter={state_filter} />
            </section>
        </main>
    );
}
