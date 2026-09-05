export interface TurnstileOptions {
    sitekey: string;
    size: "compact";
    theme: "light";
    retry: "never";
    "refresh-expired": "manual";
    "refresh-timeout": "manual";
    "response-field": false;
    callback: (token: string) => void;
    "error-callback": () => void;
    "expired-callback": () => void;
    "timeout-callback": () => void;
}
export interface TurnstileAPI {
    render: (container: HTMLElement, options: TurnstileOptions) => string;
    remove: (widget: string) => void;
}
declare global {
    interface Window {
        turnstile?: TurnstileAPI;
    }
}

let loading: Promise<TurnstileAPI> | null = null;

export function captcha_site_key(): string | null {
    if (import.meta.env.VITE_SUPABASE_URL === "http://127.0.0.1:54321") return null;
    const key = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";
    if (!/^0x4[A-Za-z0-9_-]{15,97}$/u.test(key)) throw new Error("CAPTCHA_CONFIGURATION_INVALID");
    return key;
}

export function load_turnstile(): Promise<TurnstileAPI> {
    if (window.turnstile !== undefined) return Promise.resolve(window.turnstile);
    if (loading !== null) return loading;
    // One script per document also avoids duplicate loads during React StrictMode remounts.
    loading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const timeout = globalThis.setTimeout(() => {
            script.remove();
            reject(new Error("CAPTCHA_UNAVAILABLE"));
        }, 15_000);
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.addEventListener(
            "load",
            () => {
                globalThis.clearTimeout(timeout);
                if (window.turnstile === undefined) reject(new Error("CAPTCHA_UNAVAILABLE"));
                else resolve(window.turnstile);
            },
            { once: true },
        );
        script.addEventListener(
            "error",
            () => {
                globalThis.clearTimeout(timeout);
                reject(new Error("CAPTCHA_UNAVAILABLE"));
            },
            { once: true },
        );
        document.head.append(script);
    });
    return loading;
}
