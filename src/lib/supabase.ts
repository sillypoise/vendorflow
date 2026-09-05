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
    if (publishable_key.length === 0) {
        throw new Error("SUPABASE_CONFIGURATION_MISSING");
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
        global: { headers: { "X-Client-Info": "vendorflow-web/0.1.0" } },
        realtime: { params: { eventsPerSecond: 1 } },
    });
    return supabase_client;
}
