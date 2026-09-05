import { useState, type SyntheticEvent } from "react";

import { get_supabase_client } from "../lib/supabase";

const demo_profiles = [
    ["maya.requester@vendorflow.example", "Maya · Requester"],
    ["jon.reviewer@vendorflow.example", "Jon · Reviewer"],
    ["priya.admin@vendorflow.example", "Priya · Administrator"],
    ["elliot.requester@vendorflow.example", "Elliot · Requester"],
] as const;

function DemoIdentityField({
    email,
    set_email,
}: {
    email: string;
    set_email: (email: string) => void;
}) {
    return (
        <label>
            Demo identity
            <select
                value={email}
                onChange={(event) => {
                    set_email(event.target.value);
                }}
            >
                {demo_profiles.map(([profile_email, label]) => (
                    <option key={profile_email} value={profile_email}>
                        {label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function PasswordField({
    password,
    set_password,
}: {
    password: string;
    set_password: (password: string) => void;
}) {
    return (
        <label>
            Password
            <input
                autoComplete="current-password"
                required
                type="password"
                value={password}
                onChange={(event) => {
                    set_password(event.target.value);
                }}
            />
        </label>
    );
}

export function SignInPage() {
    const [email, set_email] = useState<string>(demo_profiles[0][0]);
    const [password, set_password] = useState("");
    const [error_message, set_error_message] = useState<string | null>(null);
    const [submitting, set_submitting] = useState(false);

    async function handle_submit(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        set_error_message(null);
        set_submitting(true);
        try {
            const { error } = await get_supabase_client().auth.signInWithPassword({
                email,
                password,
            });
            set_error_message(error === null ? null : "The email or password was not accepted.");
        } catch {
            set_error_message("The authentication service is unavailable. Try again.");
        }
        set_submitting(false);
    }

    return (
        <main className="auth-page">
            <section className="auth-card" aria-labelledby="sign-in-heading">
                <p className="section-kicker">Local workflow access</p>
                <h1 id="sign-in-heading">Step into a role.</h1>
                <p>
                    These fictional identities exercise the same PostgreSQL permissions used by the
                    application. Public visitor isolation arrives before deployment.
                </p>
                <form
                    className="form-stack"
                    onSubmit={(event) => {
                        void handle_submit(event);
                    }}
                >
                    <DemoIdentityField email={email} set_email={set_email} />
                    <PasswordField password={password} set_password={set_password} />
                    {error_message === null ? null : (
                        <div className="error-banner">{error_message}</div>
                    )}
                    <button className="primary-button" disabled={submitting} type="submit">
                        {submitting ? "Signing in…" : "Open workspace"}
                    </button>
                </form>
            </section>
        </main>
    );
}
