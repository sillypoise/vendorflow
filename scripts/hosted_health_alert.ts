import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

// One open bot-owned issue is the durable alert; repeated failed probes do not create new issues.
assert.equal(process.env["GITHUB_ACTIONS"], "true");
assert.equal(process.env["GITHUB_REPOSITORY"], "sillypoise/vendorflow");
const run_id = process.env["GITHUB_RUN_ID"];
assert.ok(typeof run_id === "string" && /^[0-9]{1,20}$/u.test(run_id));
const title = "VendorFlow hosted health requires investigation";
const existing = spawnSync(
    "gh",
    [
        "issue",
        "list",
        "--repo",
        "sillypoise/vendorflow",
        "--state",
        "open",
        "--author",
        "github-actions[bot]",
        "--search",
        `in:title "${title}"`,
        "--limit",
        "1",
        "--json",
        "number",
    ],
    {
        encoding: "utf8",
        timeout: 15_000,
        maxBuffer: 20_000,
    },
);
assert.equal(existing.status, 0, "Could not inspect the existing health alert.");
const issues: unknown = JSON.parse(existing.stdout);
assert.ok(Array.isArray(issues) && issues.length <= 1);
if (issues.length === 0) {
    const result = spawnSync(
        "gh",
        [
            "issue",
            "create",
            "--repo",
            "sillypoise/vendorflow",
            "--title",
            title,
            "--body",
            `@sillypoise The hosted health probe failed. Inspect cleanup heartbeat, ` +
                `backlog, rate and capacity thresholds before restoring service. ` +
                `Disable signup if abuse is suspected.\n\n` +
                `Run: https://github.com/sillypoise/vendorflow/actions/runs/${run_id}\n\n` +
                `Close this issue after investigation and a successful probe.`,
        ],
        {
            encoding: "utf8",
            timeout: 15_000,
            maxBuffer: 20_000,
        },
    );
    assert.equal(result.status, 0, "Could not create the health alert.");
}
console.info("A bot-owned health alert is open for operator investigation.");
