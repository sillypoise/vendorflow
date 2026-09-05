import { useEffect, useRef, useState } from "react";
import { load_turnstile, type TurnstileAPI } from "../lib/turnstile";

type CaptchaProps = { site_key: string; on_token: (token: string | null) => void };

function useCaptcha({ site_key, on_token }: CaptchaProps) {
    const container = useRef<HTMLDivElement>(null);
    const [failed, set_failed] = useState(false);
    useEffect(() => {
        let active = true;
        let accepting = true;
        let widget: string | null = null;
        let api: TurnstileAPI | null = null;
        function fail() {
            accepting = false;
            if (active) {
                on_token(null);
                set_failed(true);
            }
        }
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
            if (widget !== null) api?.remove(widget);
        };
    }, [site_key, on_token]);
    return { container, failed };
}

export function Captcha(props: CaptchaProps) {
    const { container, failed } = useCaptcha(props);
    return (
        <div className="captcha">
            <p>Complete the security verification to start.</p>
            <div ref={container} aria-label="Security verification" />
            {failed ? (
                <p role="alert">Verification expired or failed. Reload this page to try again.</p>
            ) : null}
        </div>
    );
}
