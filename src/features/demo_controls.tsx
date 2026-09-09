import { useState } from "react";

import { get_supabase_client } from "../lib/supabase";
import { throw_database_error, type MembershipRole } from "../lib/vendor_requests";
import { MutationError } from "./feedback";

function useDemoControl() {
    const [pending, set_pending] = useState(false);
    const [error, set_error] = useState<unknown>(null);
    async function control(action: MembershipRole | "reset") {
        set_pending(true);
        set_error(null);
        try {
            const result = await get_supabase_client().rpc("demo_control", { p_action: action });
            throw_database_error(result.error);
            // A full navigation discards old-role queries, forms, and pending UI state together.
            globalThis.location.assign("/requests");
        } catch (failure) {
            set_error(failure);
            set_pending(false);
        }
    }
    return { control, pending, error };
}

export function DemoControls({ role }: { role: MembershipRole }) {
    const { control, pending, error } = useDemoControl();
    return (
        <section className="demo-toolbar" aria-label="Private preview controls">
            <p>Sample data · Your private workspace · Expires after 24 hours</p>
            <div className="button-row">
                <label>
                    Preview role
                    <select
                        disabled={pending}
                        value={role}
                        onChange={(event) => {
                            const next = event.target.value;
                            if (
                                next === "requester" ||
                                next === "administrator" ||
                                next === "reviewer"
                            ) {
                                void control(next);
                            }
                        }}
                    >
                        <option value="requester">Requester</option>
                        <option value="administrator">Administrator</option>
                        <option value="reviewer">Reviewer</option>
                    </select>
                </label>
                <button
                    type="button"
                    className="secondary-button"
                    disabled={pending}
                    onClick={() => {
                        if (
                            globalThis.confirm(
                                "Delete your workspace requests and history and restore the sample data?",
                            )
                        ) {
                            void control("reset");
                        }
                    }}
                >
                    Reset workspace
                </button>
            </div>
            <MutationError error={error} />
        </section>
    );
}
