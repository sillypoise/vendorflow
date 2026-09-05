import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { Database } from "../lib/database.types";
import { get_supabase_client } from "../lib/supabase";
import {
    get_membership,
    get_organization_name,
    workflow_error_message,
    type Membership,
} from "../lib/vendor_requests";
import { ErrorPage, LoadingPage } from "./feedback";
import { SignInPage } from "./sign_in_page";

type SessionState = { status: "loading" } | { status: "ready"; session: Session | null };
export type ApplicationContext = {
    membership: Membership;
    organization_name: string;
    session: Session;
};

const ApplicationContextProvider = createContext<ApplicationContext | null>(null);

export function useApplicationContext(): ApplicationContext {
    const context = useContext(ApplicationContextProvider);
    if (context === null) throw new Error("Application context is unavailable.");
    return context;
}

function WorkspaceHeader({
    context,
    on_sign_out,
}: {
    context: ApplicationContext;
    on_sign_out: () => void;
}) {
    return (
        <header className="workspace-header">
            <Link className="brand" to="/" aria-label="VendorFlow home">
                <span className="brand-mark" aria-hidden="true">
                    VF
                </span>
                <span>VendorFlow</span>
            </Link>
            <nav aria-label="Workspace navigation">
                <Link to="/requests" activeProps={{ "aria-current": "page" }}>
                    Requests
                </Link>
            </nav>
            <div className="identity-block">
                <span>{context.membership.display_name}</span>
                <small>{context.membership.role}</small>
            </div>
            <button className="text-button" onClick={on_sign_out} type="button">
                Sign out
            </button>
        </header>
    );
}

function useWorkspaceSignOut() {
    const navigate = useNavigate();
    const query_client = useQueryClient();
    async function sign_out() {
        try {
            const { error } = await get_supabase_client().auth.signOut({ scope: "local" });
            if (error !== null) {
                globalThis.location.reload();
                return;
            }
            query_client.clear();
            await navigate({ to: "/" });
        } catch {
            globalThis.location.reload();
        }
    }
    return () => {
        void sign_out();
    };
}

function Workspace({ session }: { session: Session }) {
    const handle_sign_out = useWorkspaceSignOut();
    const membership_query = useQuery({
        queryKey: ["membership", session.user.id],
        queryFn: () => get_membership(get_supabase_client(), session.user.id),
    });
    const organization_query = useQuery({
        enabled: membership_query.data !== undefined,
        queryKey: ["organization", membership_query.data?.organization_id],
        queryFn: () =>
            get_organization_name(
                get_supabase_client(),
                membership_query.data?.organization_id ?? "",
            ),
    });
    const context = useMemo<ApplicationContext | null>(() => {
        if (membership_query.data === undefined) return null;
        if (organization_query.data === undefined) return null;
        return {
            membership: membership_query.data,
            organization_name: organization_query.data,
            session,
        };
    }, [membership_query.data, organization_query.data, session]);
    if (membership_query.isPending || organization_query.isPending) {
        return <LoadingPage message="Loading your organization…" />;
    }
    if (membership_query.isError || organization_query.isError || context === null) {
        const error = membership_query.error ?? organization_query.error;
        return <ErrorPage message={workflow_error_message(error)} />;
    }
    return (
        <div className="workspace-shell">
            <WorkspaceHeader context={context} on_sign_out={handle_sign_out} />
            <ApplicationContextProvider.Provider value={context}>
                <Outlet />
            </ApplicationContextProvider.Provider>
        </div>
    );
}

function useSessionState(client: SupabaseClient<Database> | null): SessionState {
    const [session_state, set_session_state] = useState<SessionState>({ status: "loading" });
    useEffect(() => {
        let active = true;
        let unsubscribe = () => {};
        if (client !== null) {
            void client.auth.getSession().then(
                ({ data, error }) => {
                    if (!active) return;
                    set_session_state({
                        status: "ready",
                        session: error === null ? data.session : null,
                    });
                },
                () => {
                    if (active) set_session_state({ status: "ready", session: null });
                },
            );
            const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
                if (active) set_session_state({ status: "ready", session });
            });
            unsubscribe = () => {
                listener.subscription.unsubscribe();
            };
        }
        return () => {
            active = false;
            unsubscribe();
        };
    }, [client]);
    return session_state;
}

export function AuthenticatedLayout() {
    const [client] = useState(() => {
        try {
            return get_supabase_client();
        } catch {
            return null;
        }
    });
    const session_state = useSessionState(client);
    if (client === null) {
        return (
            <ErrorPage message="Supabase is not configured. Start the local database and retry." />
        );
    }
    if (session_state.status === "loading") return <LoadingPage message="Checking your session…" />;
    if (session_state.session === null) return <SignInPage />;
    return <Workspace session={session_state.session} />;
}
