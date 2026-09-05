import { useState } from "react";

import { get_supabase_client } from "../lib/supabase";

function useStartSession() {
    const [error_message, set_error_message] = useState<string | null>(null);
    const [submitting, set_submitting] = useState(false);

    async function start_session() {
        set_error_message(null);
        set_submitting(true);
        try {
            const { error } = await get_supabase_client().auth.signInAnonymously();
            if (error !== null) {
                set_error_message("A private session could not be created. Please try again.");
            }
        } catch {
            set_error_message("The authentication service is unavailable. Please try again.");
        } finally {
            set_submitting(false);
        }
    }

    return { error_message, submitting, start_session };
}

export function SignInPage() {
    const { error_message, submitting, start_session } = useStartSession();
    return (
        <main className="auth-page">
            <section className="auth-card" aria-labelledby="sign-in-heading">
                <p className="section-kicker">Independent product concept</p>
                <h1 id="sign-in-heading">Your own workflow.</h1>
                <p>
                    Start a private, 24-hour workspace with fictional vendor data. No email or
                    password needed. Other visitors cannot see or change your requests.
                </p>
                <p>
                    Try requester, administrator, and reviewer roles in your own workspace. Role
                    switching is a demo simulation; workflow decisions are real database writes.
                </p>
                {error_message === null ? null : (
                    <div className="error-banner" role="alert">
                        {error_message}
                    </div>
                )}
                <button
                    className="primary-button"
                    disabled={submitting}
                    type="button"
                    onClick={() => {
                        void start_session();
                    }}
                >
                    {submitting ? "Creating private session…" : "Start private demo"}
                </button>
                <p>
                    <a href="/">Back to introduction</a>
                </p>
            </section>
        </main>
    );
}
