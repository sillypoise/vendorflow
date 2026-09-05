import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { field, management_request } from "./hosted_api.ts";

export async function hosted_migrations(apply: boolean): Promise<void> {
    const revision = spawnSync("git", ["rev-parse", "HEAD"], {
        timeout: 10_000,
        encoding: "utf8",
        maxBuffer: 1000,
    });
    assert.equal(revision.status, 0);
    const commit = revision.stdout.trim();
    assert.ok(/^[a-f0-9]{40}$/u.test(commit));
    const files = readdirSync("supabase/migrations").toSorted();
    assert.ok(files.length > 0 && files.length <= 100);
    const applied = await management_request({ path: "/database/migrations", body: null });
    assert.ok(Array.isArray(applied) && applied.length <= 100);
    const versions = new Set<unknown>(applied.map((row: unknown) => field(row, "version")));
    const local_versions = new Set(files.map((file) => file.slice(0, 14)));
    assert.equal(local_versions.size, files.length);
    assert.equal(versions.size, applied.length);
    assert.ok(
        [...versions].every(
            (version) => typeof version === "string" && local_versions.has(version),
        ),
    );
    const pending = files.filter((file) => !versions.has(file.slice(0, 14)));
    assert.ok(files.every((file) => /^20[0-9]{12}_[a-z0-9_]+\.sql$/u.test(file)));
    assert.ok(files.slice(0, versions.size).every((file) => versions.has(file.slice(0, 14))));
    console.info({ commit, pending_migrations: pending });
    if (apply) {
        const clean = spawnSync("git", ["diff", "--quiet", "HEAD", "--", "supabase/migrations"], {
            timeout: 10_000,
            encoding: "utf8",
            maxBuffer: 1_000_000,
        });
        assert.equal(clean.status, 0, "Commit migrations before applying them.");
        // The bounded promise chain preserves dependencies between successive schema versions.
        await pending.reduce(
            (previous, file) => previous.then(() => hosted_migrations_apply({ file, commit })),
            Promise.resolve(),
        );
    }
}

async function hosted_migrations_apply({
    file,
    commit,
}: {
    file: string;
    commit: string;
}): Promise<void> {
    const match = /^(20[0-9]{12})_([a-z0-9_]+)\.sql$/u.exec(file);
    assert.ok(match !== null);
    const version = match[1];
    const name = match[2];
    assert.ok(version !== undefined && name !== undefined);
    const tracked = spawnSync("git", ["show", `${commit}:supabase/migrations/${file}`], {
        timeout: 10_000,
        encoding: "utf8",
        maxBuffer: 1_000_000,
    });
    assert.equal(tracked.status, 0, "Commit migrations before applying them.");
    const sql = tracked.stdout;
    assert.ok(sql.length > 0 && sql.length < 500_000);
    assert.equal(sql.includes("$vendorflow_source$"), false);
    const query = `begin;
        set local statement_timeout = '30s';
        set local idle_in_transaction_session_timeout = '60s';
        select pg_advisory_xact_lock(20260906, 1);
        create schema if not exists supabase_migrations;
        create table if not exists supabase_migrations.schema_migrations (
            version text primary key, statements text[], name text
        );
        do $guard$ begin
            if exists (select 1 from supabase_migrations.schema_migrations
                where version = '${version}') then
                raise exception 'MIGRATION_ALREADY_APPLIED';
            end if;
        end; $guard$;
        ${sql}
        insert into supabase_migrations.schema_migrations(version, name, statements)
        values ('${version}', '${name}', array[$vendorflow_source$${sql}$vendorflow_source$]);
        commit;`;
    await management_request({ path: "/database/query", body: { query } });
    console.info(`Applied migration ${file}.`);
}
