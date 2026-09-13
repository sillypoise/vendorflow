import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "@tanstack/react-router";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

import type { Database } from "../lib/database.types";
import { get_supabase_client } from "../lib/supabase";
import {
    get_membership,
    get_organization_name,
    throw_database_error,
    workflow_error_message,
    type Membership,
} from "../lib/vendor_requests";
import { DemoControls } from "./demo_controls";
import { LoadingPage } from "./feedback";
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

function EndSessionButton() {
    const [error, set_error] = useState(false);
    const [pending, set_pending] = useState(false);
    async function end_session() {
        set_pending(true);
        try {
            const result = await get_supabase_client().auth.signOut({ scope: "local" });
            if (result.error !== null) throw result.error;
            globalThis.location.assign("/");
        } catch {
            set_error(true);
            set_pending(false);
        }
    }
    return (
        <div>
            <button
                className="text-button"
                disabled={pending}
                type="button"
                onClick={() => {
                    void end_session();
                }}
            >
                End session
            </button>
            {error ? <p role="alert">Could not end the session. Please retry.</p> : null}
        </div>
    );
}

function WorkspaceHeader({ context }: { context: ApplicationContext }) {
    return (
        <header className="workspace-header">
            <Link className="brand" to="/" aria-label="VendorFlow home">
                <img
                    className="brand-mark"
                    src="/vendorflow-mark.svg"
                    alt=""
                    width="40"
                    height="40"
                />
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
            <EndSessionButton />
        </header>
    );
}

function PrivateQueries({ context }: { context: ApplicationContext }) {
    // Mounted per identity and role, so another session can never reuse prior private query data.
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: { retry: false, staleTime: 0, gcTime: 60_000 },
                    mutations: { retry: false },
                },
            }),
    );
    return (
        <QueryClientProvider client={client}>
            <ApplicationContextProvider.Provider value={context}>
                <Outlet />
            </ApplicationContextProvider.Provider>
        </QueryClientProvider>
    );
}

function Workspace({ session }: { session: Session }) {
    const context_query = useQuery({
        queryKey: ["workspace", session.user.id],
        retry: false,
        staleTime: 0,
        refetchInterval: 30_000,
        queryFn: async (): Promise<ApplicationContext> => {
            const client = get_supabase_client();
            const provision = await client.rpc("start_demo");
            throw_database_error(provision.error);
            const membership = await get_membership(client, session.user.id);
            const organization_name = await get_organization_name(
                client,
                membership.organization_id,
            );
            return { membership, organization_name, session };
        },
    });
    if (context_query.isError)
        return (
            <main className="message-page">
                <h1>Workspace unavailable</h1>
                <p role="alert">{workflow_error_message(context_query.error)}</p>
                <button
                    type="button"
                    onClick={() => {
                        void context_query.refetch();
                    }}
                >
                    Retry
                </button>
                <EndSessionButton />
            </main>
        );
    if (context_query.isPending) return <LoadingPage message="Preparing your private workspace…" />;
    const context = context_query.data;
    return (
        <div className="workspace-shell">
            <WorkspaceHeader context={context} />
            <DemoControls role={context.membership.role} />
            <PrivateQueries
                key={`${session.user.id}:${context.membership.role}`}
                context={context}
            />
        </div>
    );
}

function useSessionState(client: SupabaseClient<Database> | null): SessionState {
    const [state, set_state] = useState<SessionState>({ status: "loading" });
    useEffect(() => {
        let active = true;
        let unsubscribe = () => {};
        if (client !== null) {
            // INITIAL_SESSION and subsequent events have one ordered source, avoiding a getSession race.
            const { data } = client.auth.onAuthStateChange((_event, session) => {
                if (active) set_state({ status: "ready", session });
            });
            unsubscribe = () => {
                data.subscription.unsubscribe();
            };
        }
        return () => {
            active = false;
            unsubscribe();
        };
    }, [client]);
    return state;
}

export function AuthenticatedLayout() {
    const [client] = useState(() => {
        try {
            return get_supabase_client();
        } catch {
            return null;
        }
    });
    const state = useSessionState(client);
    if (client === null)
        return (
            <main className="message-page">
                <h1>Setup required</h1>
                <p>Start the local database, then reload this page.</p>
                <a href="/">Return home</a>
            </main>
        );
    if (state.status === "loading") return <LoadingPage message="Checking your session…" />;
    if (state.session === null) return <SignInPage />;
    return <Workspace key={state.session.user.id} session={state.session} />;
}
