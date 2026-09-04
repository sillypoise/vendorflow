import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import image_lock from "../supabase/images.lock.json" with { type: "json" };

const allowed_repositories = [
    "ghcr.io/supabase/gotrue",
    "ghcr.io/supabase/kong",
    "ghcr.io/supabase/postgres",
    "ghcr.io/supabase/postgrest",
] as const;
const policy_path = fileURLToPath(new URL("../supabase/containers-policy.json", import.meta.url));

assert.equal(image_lock.version, 1);
assert.equal(image_lock.platform, "linux/amd64");
assert.ok(Array.isArray(image_lock.images));
assert.ok(image_lock.images.length > 0);
assert.ok(image_lock.images.length <= 8);

if (process.platform !== "linux") {
    throw new Error("The local Supabase image lock currently supports Linux only.");
}

if (process.arch !== "x64") {
    throw new Error("The local Supabase image lock currently supports amd64 only.");
}

for (const image of image_lock.images) {
    assert.equal(typeof image.tag, "string");
    assert.equal(typeof image.digest, "string");
    assert.match(image.digest, /^sha256:[a-f0-9]{64}$/u);

    const repository = image.tag.slice(0, image.tag.lastIndexOf(":"));
    const repository_is_allowed = allowed_repositories.some(
        (allowed_repository) => allowed_repository === repository,
    );

    if (!repository_is_allowed) {
        throw new Error(`Image repository is not allowed: ${repository}`);
    }

    const existing_image_result = spawnSync(
        "podman",
        ["image", "inspect", image.tag, "--format={{.Digest}}"],
        { encoding: "utf8", timeout: 30_000 },
    );

    if (existing_image_result.error !== undefined) {
        throw existing_image_result.error;
    }

    const existing_digest =
        existing_image_result.status === 0 ? existing_image_result.stdout.trim() : "";

    if (existing_digest === image.digest) {
        process.stdout.write(`Verified ${image.tag}.\n`);
        continue;
    }

    const pull_result = spawnSync(
        "podman",
        [
            "pull",
            "--arch=amd64",
            "--os=linux",
            `--signature-policy=${policy_path}`,
            `${repository}@${image.digest}`,
        ],
        { encoding: "utf8", timeout: 300_000 },
    );

    if (pull_result.error !== undefined) {
        throw pull_result.error;
    }

    if (pull_result.status !== 0) {
        throw new Error(`Failed to pull locked image ${image.tag}.`);
    }

    const tag_result = spawnSync("podman", ["tag", `${repository}@${image.digest}`, image.tag], {
        encoding: "utf8",
        timeout: 30_000,
    });

    if (tag_result.error !== undefined) {
        throw tag_result.error;
    }

    if (tag_result.status !== 0) {
        throw new Error(`Failed to tag locked image ${image.tag}.`);
    }

    const inspect_result = spawnSync(
        "podman",
        ["image", "inspect", image.tag, "--format={{.Digest}}"],
        { encoding: "utf8", timeout: 30_000 },
    );

    if (inspect_result.error !== undefined) {
        throw inspect_result.error;
    }

    if (inspect_result.status !== 0) {
        throw new Error(`Failed to inspect locked image ${image.tag}.`);
    }

    assert.equal(inspect_result.stdout.trim(), image.digest);
    process.stdout.write(`Prepared ${image.tag}.\n`);
}
