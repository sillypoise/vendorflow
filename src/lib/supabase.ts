import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

let supabase_client: SupabaseClient<Database> | null = null;

export function get_supabase_client(): SupabaseClient<Database> {
    if (supabase_client !== null) {
        return supabase_client;
    }

    const api_url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
    const publishable_key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
    if (api_url.length === 0) {
        throw new Error("SUPABASE_CONFIGURATION_MISSING");
    }
    if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/u.test(publishable_key)) {
        throw new Error("SUPABASE_CONFIGURATION_INVALID");
    }

    const parsed_url = new URL(api_url);
    const local_http = parsed_url.protocol === "http:" && parsed_url.hostname === "127.0.0.1";
    if (parsed_url.protocol === "https:") {
        // Hosted traffic must use TLS; plain HTTP is restricted to the loopback development stack.
    } else if (!local_http) {
        throw new Error("SUPABASE_CONFIGURATION_INVALID");
    }

    supabase_client = createClient<Database>(api_url, publishable_key, {
        auth: {
            autoRefreshToken: true,
            detectSessionInUrl: true,
            persistSession: true,
        },
        db: { schema: "public" },
        global: {
            headers: { "X-Client-Info": "vendorflow-web/0.1.0" },
            fetch: (input, options) => {
                const timeout = AbortSignal.timeout(15_000);
                const signal = options?.signal;
                return fetch(input, {
                    ...options,
                    signal:
                        signal === null || signal === undefined
                            ? timeout
                            : AbortSignal.any([signal, timeout]),
                });
            },
        },
        realtime: { params: { eventsPerSecond: 1 } },
    });
    return supabase_client;
}
