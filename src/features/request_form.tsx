import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { get_supabase_client } from "../lib/supabase";
import {
    create_vendor_request,
    get_vendor_request,
    update_vendor_request,
    workflow_error_message,
    type VendorRequest,
} from "../lib/vendor_requests";
import { useApplicationContext } from "./authenticated_layout";
import { RequestFields } from "./request_form_fields";
import {
    empty_request_form,
    request_form_to_draft,
    request_to_form,
    type RequestFormValues,
} from "./request_form_model";

function useRequestEditorForm(
    default_values: RequestFormValues,
    save: (values: RequestFormValues) => Promise<void>,
) {
    return useForm({
        defaultValues: default_values,
        onSubmit: ({ value }) => save(value),
    });
}

export type RequestEditorForm = ReturnType<typeof useRequestEditorForm>;

function useRequestFormController(request: VendorRequest | null) {
    const navigate = useNavigate();
    const query_client = useQueryClient();
    const [submit_error, set_submit_error] = useState<string | null>(null);
    const save_mutation = useMutation({
        mutationFn: (values: RequestFormValues) => {
            const draft = request_form_to_draft(values);
            return request === null
                ? create_vendor_request(get_supabase_client(), draft)
                : update_vendor_request(get_supabase_client(), request, draft);
        },
    });
    const form = useRequestEditorForm(
        request === null ? empty_request_form : request_to_form(request),
        async (values) => {
            set_submit_error(null);
            try {
                const saved_request = await save_mutation.mutateAsync(values);
                await query_client.invalidateQueries({ queryKey: ["vendor_requests"] });
                await navigate({
                    params: { requestId: saved_request.id },
                    to: "/requests/$requestId",
                });
            } catch (error) {
                set_submit_error(workflow_error_message(error));
            }
        },
    );
    return { form, submit_error };
}

function CancelLink({ request }: { request: VendorRequest | null }) {
    return request === null ? (
        <Link className="secondary-button" to="/requests">
            Cancel
        </Link>
    ) : (
        <Link
            className="secondary-button"
            params={{ requestId: request.id }}
            to="/requests/$requestId"
        >
            Cancel
        </Link>
    );
}

function FormActions({
    form,
    request,
}: {
    form: RequestEditorForm;
    request: VendorRequest | null;
}) {
    return (
        <div className="form-actions full-field">
            <CancelLink request={request} />
            <form.Subscribe
                selector={(state) => ({
                    can_submit: state.canSubmit,
                    is_submitting: state.isSubmitting,
                })}
            >
                {({ can_submit, is_submitting }) => (
                    <button
                        className="primary-button"
                        disabled={!can_submit || is_submitting}
                        type="submit"
                    >
                        {is_submitting ? "Saving…" : "Save draft"}
                    </button>
                )}
            </form.Subscribe>
        </div>
    );
}

function RequestForm({ request }: { request: VendorRequest | null }) {
    const { form, submit_error } = useRequestFormController(request);
    return (
        <form
            className="request-form"
            onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
            }}
        >
            <RequestFields form={form} />
            {submit_error === null ? null : (
                <div className="error-banner full-field" role="alert">
                    {submit_error}
                </div>
            )}
            <FormActions form={form} request={request} />
        </form>
    );
}

export function NewRequestPage() {
    const { membership } = useApplicationContext();
    if (membership.role !== "requester") {
        return (
            <FormMessage
                title="Requester access required"
                message="Your role cannot create vendor requests."
            />
        );
    }
    return (
        <FormPageHeading title="New vendor request">
            <RequestForm request={null} />
        </FormPageHeading>
    );
}

function EditableRequestPage({ request }: { request: VendorRequest }) {
    return (
        <FormPageHeading title="Edit vendor request">
            <RequestForm request={request} />
        </FormPageHeading>
    );
}

export function EditRequestPage() {
    const { membership, session } = useApplicationContext();
    const { requestId } = useParams({ from: "/_authenticated/requests/$requestId/edit" });
    const request_query = useQuery({
        queryKey: ["vendor_request", requestId],
        queryFn: () => get_vendor_request(get_supabase_client(), requestId),
    });
    if (request_query.isPending) {
        return <FormMessage title="Loading request" message="Retrieving the latest draft…" />;
    }
    if (request_query.isError) {
        return (
            <FormMessage
                title="Unable to edit"
                message={workflow_error_message(request_query.error)}
            />
        );
    }
    const request = request_query.data;
    if (membership.role !== "requester") {
        return (
            <FormMessage
                title="Requester access required"
                message="Your role cannot edit vendor requests."
            />
        );
    }
    if (request.owner_user_id !== session.user.id) {
        return (
            <FormMessage
                title="Request unavailable"
                message="This request is unavailable or no longer exists."
            />
        );
    }
    if (request.state === "draft") return <EditableRequestPage request={request} />;
    if (request.state === "changes_requested") return <EditableRequestPage request={request} />;
    return (
        <FormMessage
            title="Request cannot be edited"
            message="Only drafts and requests with requested changes are editable."
        />
    );
}

function FormPageHeading({ children, title }: { children: ReactNode; title: string }) {
    return (
        <main className="workspace-main narrow-main">
            <header className="page-heading">
                <p className="section-kicker">Draft workspace</p>
                <h1>{title}</h1>
                <p>Save incomplete work safely. Submit from the detail page.</p>
            </header>
            {children}
        </main>
    );
}

function FormMessage({ message, title }: { message: string; title: string }) {
    return (
        <main className="workspace-main narrow-main">
            <div className="empty-state">
                <h1>{title}</h1>
                <p role="alert">{message}</p>
                <Link className="text-link" to="/requests">
                    Return to requests
                </Link>
            </div>
        </main>
    );
}
