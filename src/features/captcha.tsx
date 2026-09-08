import { useEffect, useRef, useState, type RefObject } from "react";
import { load_turnstile, type TurnstileAPI } from "../lib/turnstile";

type CaptchaProps = { site_key: string; on_token: (token: string | null) => void };

type CaptchaState = CaptchaProps & {
    container: RefObject<HTMLDivElement | null>;
    failed: boolean;
    set_failed: (failed: boolean) => void;
};

function useCaptcha({ site_key, on_token, container, failed, set_failed }: CaptchaState) {
    useEffect(() => {
        if (failed) return () => {};
        let active = true;
        let accepting = true;
        let widget: string | null = null;
        let api: TurnstileAPI | null = null;
        function fail() {
            window.clearTimeout(deadline);
            accepting = false;
            if (active) {
                on_token(null);
                set_failed(true);
            }
        }
        // A provider iframe can stall without emitting an error or timeout callback.
        const deadline = window.setTimeout(fail, 60_000);
        void load_turnstile()
            .then((loaded) => {
                if (!active || container.current === null) return;
                api = loaded;
                widget = loaded.render(container.current, {
                    sitekey: site_key,
                    size: "compact",
                    theme: "light",
                    retry: "never",
                    "refresh-expired": "manual",
                    "refresh-timeout": "manual",
                    "response-field": false,
                    callback: (token) => {
                        if (!active || !accepting) return;
                        accepting = false;
                        window.clearTimeout(deadline);
                        if (/^[A-Za-z0-9_.-]{1,2048}$/u.test(token)) on_token(token);
                        else fail();
                    },
                    "error-callback": fail,
                    "expired-callback": fail,
                    "timeout-callback": fail,
                });
            })
            .catch(fail);
        return () => {
            active = false;
            window.clearTimeout(deadline);
            captcha_remove({ api, widget });
        };
    }, [site_key, on_token, failed, container, set_failed]);
}

function captcha_remove({ api, widget }: { api: TurnstileAPI | null; widget: string | null }) {
    // Provider disposal must not throw into React's teardown or expose provider diagnostics.
    try {
        if (widget !== null) api?.remove(widget);
    } catch {
        console.warn("Verification widget cleanup failed; reload the page.");
    }
}

export function Captcha(props: CaptchaProps) {
    const container = useRef<HTMLDivElement>(null);
    const [failed, set_failed] = useState(false);
    useCaptcha({ ...props, container, failed, set_failed });
    return (
        <div className="captcha">
            <p>Complete the security verification to start.</p>
            <div ref={container} aria-label="Security verification" />
            {failed ? (
                <div>
                    <p role="alert">
                        Verification expired or failed. Reload this page to try again.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            window.location.reload();
                        }}
                    >
                        Reload verification
                    </button>
                </div>
            ) : null}
        </div>
    );
}
