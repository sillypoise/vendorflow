import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// Supabase mounts only SQL tests. Pin their inline replay to the actual immutable migration.
it("runs the migration's exact backfill predicates in the label preservation tests", () => {
    const migration = readFileSync("supabase/migrations/20260911030000_preview_labels.sql", "utf8");
    const tests = readFileSync("supabase/tests/preview_labels.test.sql", "utf8");
    const marker = "-- Rename only system-generated labels";
    expect(migration).toContain(marker);
    expect(tests).toContain(migration.slice(migration.indexOf(marker)).trim());
});
