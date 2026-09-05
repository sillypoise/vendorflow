import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";

import { get_supabase_client } from "../lib/supabase";
import {
    get_vendor_request,
    list_audit_events,
    workflow_error_message,
    type AuditEvent,
    type VendorRequest,
} from "../lib/vendor_requests";
import { useApplicationContext, type ApplicationContext } from "./authenticated_layout";
import { LoadingPage } from "./feedback";
import { PermittedActions } from "./request_actions";
import { format_spend, format_timestamp, request_state_label } from "./request_presenters";

function format_boolean(value: boolean | null): string {
    if (value === null) return "Not answered";
    return value ? "Yes" : "No";
}

function RequestFacts({ request }: { request: VendorRequest }) {
    return (
        <section className="detail-card" aria-labelledby="request-information-heading">
            <h2 id="request-information-heading">Request information</h2>
            <dl className="detail-list">
                <div>
                    <dt>Website</dt>
                    <dd>
                        {request.vendor_website === null ? (
                            "Not provided"
                        ) : (
                            <a href={request.vendor_website} rel="noreferrer" target="_blank">
                                {request.vendor_website}
                            </a>
                        )}
                    </dd>
                </div>
                <div>
                    <dt>Category</dt>
                    <dd>{request.service_category?.replaceAll("_", " ") ?? "Not provided"}</dd>
                </div>
                <div>
                    <dt>Annual spend</dt>
                    <dd>{format_spend(request.annual_spend_minor_units, request.currency_code)}</dd>
                </div>
                <div>
                    <dt>Confidential data</dt>
                    <dd>{format_boolean(request.receives_confidential_data)}</dd>
                </div>
                <div>
                    <dt>Critical process</dt>
                    <dd>{format_boolean(request.supports_critical_process)}</dd>
                </div>
                <div className="wide-fact">
                    <dt>Business justification</dt>
                    <dd>{request.business_justification ?? "Not provided"}</dd>
                </div>
            </dl>
        </section>
    );
}

function AuditHistory({ events }: { events: AuditEvent[] }) {
    return (
        <section className="detail-card" aria-labelledby="history-heading">
            <h2 id="history-heading">Decision history</h2>
            <ol className="timeline">
                {events.map((event) => (
                    <li key={event.id}>
                        <span className="timeline-dot" aria-hidden="true" />
                        <div>
                            <strong>{event.action.replaceAll("_", " ")}</strong>
                            <span>
                                {event.actor_role} · {format_timestamp(event.created_at)}
                            </span>
                            {event.reason === null ? null : <p>{event.reason}</p>}
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function RequestDetail({
    audit_events,
    context,
    request,
}: {
    audit_events: AuditEvent[];
    context: ApplicationContext;
    request: VendorRequest;
}) {
    return (
        <main className="workspace-main">
            <Link className="back-link" to="/requests">
                ← All requests
            </Link>
            <header className="page-heading detail-heading">
                <div>
                    <span className={`status-badge status-${request.state}`}>
                        {request_state_label(request.state)}
                    </span>
                    <h1>{request.vendor_legal_name ?? "Untitled vendor"}</h1>
                    <p>
                        Updated {format_timestamp(request.updated_at)} · Revision {request.revision}
                    </p>
                </div>
            </header>
            <div className="detail-layout">
                <div>
                    <RequestFacts request={request} />
                    <AuditHistory events={audit_events} />
                </div>
                <aside>
                    <PermittedActions context={context} request={request} />
                </aside>
            </div>
        </main>
    );
}

export function RequestDetailPage() {
    const context = useApplicationContext();
    const { requestId } = useParams({ from: "/_authenticated/requests/$requestId" });
    const request_query = useQuery({
        queryKey: ["vendor_request", requestId],
        queryFn: () => get_vendor_request(get_supabase_client(), requestId),
    });
    const audit_query = useQuery({
        queryKey: ["audit_events", requestId],
        queryFn: () => list_audit_events(get_supabase_client(), requestId),
    });
    if (request_query.isPending || audit_query.isPending) {
        return <LoadingPage message="Retrieving the latest revision and history…" />;
    }
    if (request_query.isError || audit_query.isError) {
        const error = request_query.error ?? audit_query.error;
        return (
            <DetailMessage title="Request unavailable" message={workflow_error_message(error)} />
        );
    }
    return (
        <RequestDetail
            audit_events={audit_query.data}
            context={context}
            request={request_query.data}
        />
    );
}

function DetailMessage({ message, title }: { message: string; title: string }) {
    return (
        <main className="workspace-main narrow-main">
            <div className="empty-state">
                <h1>{title}</h1>
                <p role="alert">{message}</p>
                <div className="button-row">
                    <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                            globalThis.location.reload();
                        }}
                    >
                        Reload request
                    </button>
                    <Link className="text-link" to="/requests">
                        Return to requests
                    </Link>
                </div>
            </div>
        </main>
    );
}
