import { useState } from "react";

import { get_supabase_client } from "../lib/supabase";
import { captcha_site_key } from "../lib/turnstile";
import { Captcha } from "./captcha";

function useStartSession() {
    const [error_message, set_error_message] = useState<string | null>(null);
    const [submitting, set_submitting] = useState(false);
    const [captcha_token, set_captcha_token] = useState<string | null>(null);
    const [attempt, set_attempt] = useState(0);
    const [site_key] = useState(() => {
        try {
            return captcha_site_key();
        } catch {
            return "";
        }
    });

    async function start_session() {
        if (site_key === "") return;
        if (site_key !== null && captcha_token === null) return;
        set_error_message(null);
        set_submitting(true);
        set_captcha_token(null);
        try {
            const { error } = await get_supabase_client().auth.signInAnonymously({
                options: captcha_token === null ? {} : { captchaToken: captcha_token },
            });
            if (error !== null) {
                set_error_message("A private session could not be created. Please try again.");
            }
        } catch {
            set_error_message("The authentication service is unavailable. Please try again.");
        } finally {
            set_submitting(false);
            set_attempt(attempt + 1);
        }
    }

    return {
        error_message,
        submitting,
        start_session,
        site_key,
        captcha_token,
        set_captcha_token,
        attempt,
    };
}

function SignInIntroduction() {
    return (
        <>
            <div className="brand">
                <img
                    className="brand-mark"
                    src="/vendorflow-mark.svg"
                    alt=""
                    width="40"
                    height="40"
                />
                <span>VendorFlow</span>
            </div>
            <p className="section-kicker">Independent product concept</p>
            <h1 id="sign-in-heading">Your own workflow.</h1>
            <p>
                Start a private, 24-hour workspace with sample vendor data. No email or password
                needed. Other visitors cannot see or change your requests.
            </p>
            <p>
                Try requester, administrator, and reviewer roles in your own workspace. Role
                switching simulates each responsibility; decisions are saved with an audit history.
            </p>
        </>
    );
}

export function SignInPage() {
    const {
        error_message,
        submitting,
        start_session,
        site_key,
        captcha_token,
        set_captcha_token,
        attempt,
    } = useStartSession();
    return (
        <main className="auth-page">
            <section className="auth-card" aria-labelledby="sign-in-heading">
                <SignInIntroduction />
                {error_message === null ? null : (
                    <div className="error-banner" role="alert">
                        {error_message}
                    </div>
                )}
                {site_key === "" ? (
                    <p role="alert">Security verification is not configured.</p>
                ) : null}
                {site_key !== null && site_key !== "" ? (
                    <Captcha key={attempt} site_key={site_key} on_token={set_captcha_token} />
                ) : null}
                <button
                    className="primary-button"
                    disabled={
                        submitting ||
                        site_key === "" ||
                        (site_key !== null && captcha_token === null)
                    }
                    type="button"
                    onClick={() => {
                        void start_session();
                    }}
                >
                    {submitting ? "Creating private session…" : "Start private preview"}
                </button>
                <p>
                    <a href="/">Back to introduction</a>
                </p>
            </section>
        </main>
    );
}
