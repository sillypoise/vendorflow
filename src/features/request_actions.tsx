import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { get_supabase_client } from "../lib/supabase";
import {
    assign_vendor_request,
    list_reviewers,
    review_vendor_request,
    submit_vendor_request,
    type Membership,
    type VendorRequest,
} from "../lib/vendor_requests";
import type { ApplicationContext } from "./authenticated_layout";
import { MutationError } from "./feedback";
import { request_is_complete } from "./request_presenters";

async function refresh_request(query_client: QueryClient, request_id: string): Promise<void> {
    await query_client.invalidateQueries({ queryKey: ["vendor_request", request_id] });
    await query_client.invalidateQueries({ queryKey: ["audit_events", request_id] });
    await query_client.invalidateQueries({ queryKey: ["vendor_requests"] });
}

function RequesterActions({ request }: { request: VendorRequest }) {
    const query_client = useQueryClient();
    const mutation = useMutation({
        mutationFn: () => submit_vendor_request(get_supabase_client(), request),
        onSuccess: () => refresh_request(query_client, request.id),
    });
    const editable = request.state === "draft" || request.state === "changes_requested";
    if (!editable) return null;
    const submit_label = request.state === "draft" ? "Submit request" : "Resubmit request";
    const complete = request_is_complete(request);
    return (
        <section className="action-panel" aria-labelledby="requester-action-heading">
            <p className="section-kicker">Requester action</p>
            <h2 id="requester-action-heading">
                {request.state === "draft" ? "Finish and submit" : "Correct and resubmit"}
            </h2>
            <p>Review the information before sending it to an administrator for assignment.</p>
            {complete ? null : (
                <div className="notice-banner">Complete every request field before submission.</div>
            )}
            <MutationError error={mutation.error} />
            <div className="button-row">
                <Link
                    className="secondary-button"
                    params={{ requestId: request.id }}
                    to="/requests/$requestId/edit"
                >
                    Edit request
                </Link>
                <button
                    className="primary-button"
                    disabled={!complete || mutation.isPending}
                    onClick={() => {
                        mutation.mutate();
                    }}
                    type="button"
                >
                    {mutation.isPending ? "Submitting…" : submit_label}
                </button>
            </div>
        </section>
    );
}

function ReviewerAssignmentForm({
    assign,
    pending,
    reviewer_user_id,
    reviewers,
    set_reviewer,
}: {
    assign: () => void;
    pending: boolean;
    reviewer_user_id: string;
    reviewers: Membership[] | undefined;
    set_reviewer: (reviewer_user_id: string) => void;
}) {
    return (
        <div className="inline-form">
            <label>
                Reviewer
                <select
                    disabled={pending}
                    value={reviewer_user_id}
                    onChange={(event) => {
                        set_reviewer(event.target.value);
                    }}
                >
                    <option value="">Select an active reviewer</option>
                    {reviewers?.map((reviewer) => (
                        <option key={reviewer.user_id} value={reviewer.user_id}>
                            {reviewer.display_name}
                        </option>
                    ))}
                </select>
            </label>
            <button
                className="primary-button"
                disabled={reviewer_user_id === "" || pending}
                onClick={assign}
                type="button"
            >
                {pending ? "Assigning…" : "Assign reviewer"}
            </button>
        </div>
    );
}

function AdministratorActions({ request }: { request: VendorRequest }) {
    const [reviewer_user_id, set_reviewer_user_id] = useState("");
    const query_client = useQueryClient();
    const reviewers_query = useQuery({
        enabled: request.state === "submitted",
        queryKey: ["reviewers"],
        queryFn: () => list_reviewers(get_supabase_client()),
    });
    const mutation = useMutation({
        mutationFn: () => assign_vendor_request(get_supabase_client(), request, reviewer_user_id),
        onSuccess: () => refresh_request(query_client, request.id),
    });
    if (request.state !== "submitted") return null;
    return (
        <section className="action-panel" aria-labelledby="administrator-action-heading">
            <p className="section-kicker">Administrator action</p>
            <h2 id="administrator-action-heading">Assign a reviewer</h2>
            <p>Assignment starts review and makes the request visible to that reviewer.</p>
            {reviewers_query.isError ? <MutationError error={reviewers_query.error} /> : null}
            <MutationError error={mutation.error} />
            <ReviewerAssignmentForm
                assign={() => {
                    mutation.mutate();
                }}
                pending={reviewers_query.isPending || mutation.isPending}
                reviewer_user_id={reviewer_user_id}
                reviewers={reviewers_query.data}
                set_reviewer={set_reviewer_user_id}
            />
        </section>
    );
}

type ReviewDecision = "approve" | "reject" | "request_changes";

function parse_review_decision(value: string): ReviewDecision {
    if (value === "reject") return value;
    if (value === "request_changes") return value;
    if (value === "approve") return value;
    throw new Error("Unsupported review decision.");
}

function review_reason_is_invalid(decision: ReviewDecision, reason: string): boolean {
    const reason_required = decision === "reject" || decision === "request_changes";
    if (reason.length === 0) return reason_required;
    if (reason.length > 1000) return true;
    return reason !== reason.trim();
}

function DecisionField({
    decision,
    set_decision,
}: {
    decision: ReviewDecision;
    set_decision: (decision: ReviewDecision) => void;
}) {
    return (
        <label>
            Decision
            <select
                value={decision}
                onChange={(event) => {
                    set_decision(parse_review_decision(event.target.value));
                }}
            >
                <option value="approve">Approve</option>
                <option value="request_changes">Request changes</option>
                <option value="reject">Reject</option>
            </select>
        </label>
    );
}

function ReasonField({
    decision,
    reason,
    set_reason,
}: {
    decision: ReviewDecision;
    reason: string;
    set_reason: (reason: string) => void;
}) {
    const reason_required = decision === "reject" || decision === "request_changes";
    return (
        <label>
            Decision reason {reason_required ? "(required)" : "(optional)"}
            <textarea
                maxLength={1001}
                rows={4}
                value={reason}
                onChange={(event) => {
                    set_reason(event.target.value);
                }}
            />
        </label>
    );
}

function ReviewDecisionInputs({
    decision,
    invalid_reason,
    pending,
    reason,
    set_decision,
    set_reason,
    submit,
}: {
    decision: ReviewDecision;
    invalid_reason: boolean;
    pending: boolean;
    reason: string;
    set_decision: (decision: ReviewDecision) => void;
    set_reason: (reason: string) => void;
    submit: () => void;
}) {
    return (
        <div className="form-stack">
            <DecisionField decision={decision} set_decision={set_decision} />
            <ReasonField decision={decision} reason={reason} set_reason={set_reason} />
            {invalid_reason ? (
                <span className="field-error">
                    Use 1–1,000 characters without leading or trailing spaces.
                </span>
            ) : null}
            <button
                className="primary-button"
                disabled={invalid_reason || pending}
                onClick={submit}
                type="button"
            >
                {pending ? "Recording…" : "Record decision"}
            </button>
        </div>
    );
}

function ReviewerActions({ request }: { request: VendorRequest }) {
    const [decision, set_decision] = useState<ReviewDecision>("approve");
    const [reason, set_reason] = useState("");
    const query_client = useQueryClient();
    const mutation = useMutation({
        mutationFn: () =>
            review_vendor_request(
                get_supabase_client(),
                request,
                decision,
                reason === "" ? null : reason,
            ),
        onSuccess: () => refresh_request(query_client, request.id),
    });
    if (request.state !== "in_review") return null;
    const invalid_reason = review_reason_is_invalid(decision, reason);
    return (
        <section className="action-panel" aria-labelledby="reviewer-action-heading">
            <p className="section-kicker">Reviewer action</p>
            <h2 id="reviewer-action-heading">Record a decision</h2>
            <MutationError error={mutation.error} />
            <ReviewDecisionInputs
                decision={decision}
                invalid_reason={invalid_reason}
                pending={mutation.isPending}
                reason={reason}
                set_decision={set_decision}
                set_reason={set_reason}
                submit={() => {
                    mutation.mutate();
                }}
            />
        </section>
    );
}

export function PermittedActions({
    context,
    request,
}: {
    context: ApplicationContext;
    request: VendorRequest;
}) {
    if (context.membership.role === "requester") {
        if (request.owner_user_id !== context.session.user.id) return null;
        return <RequesterActions request={request} />;
    }
    if (context.membership.role === "administrator") {
        return <AdministratorActions request={request} />;
    }
    if (request.reviewer_user_id !== context.session.user.id) return null;
    return <ReviewerActions request={request} />;
}
