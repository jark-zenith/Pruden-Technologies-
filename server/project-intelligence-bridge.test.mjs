import test from "node:test";
import assert from "node:assert/strict";
import { getProjectIntelligenceStatus } from "./project-intelligence-bridge.mjs";

test("Bridge status is in-PTMS and read-only by default", () => {
  const status = getProjectIntelligenceStatus({});
  assert.equal(status.mode, "read_only");
  assert.equal(status.implementation, "in_ptms");
  assert.equal(status.policy.writesEnabled, false);
  assert.deepEqual(status.sources.map((source) => source.id), ["github", "render", "supabase"]);
});

test("provider environment variables never imply verified connectivity", () => {
  const status = getProjectIntelligenceStatus({
    GITHUB_TOKEN: "placeholder",
    RENDER_API_KEY: "placeholder",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "placeholder"
  });
  assert.equal(status.sources.find((source) => source.id === "github").verified, false);
  assert.equal(status.sources.find((source) => source.id === "render").verified, false);
  assert.equal(status.sources.find((source) => source.id === "supabase").verified, false);
  assert.equal(status.sources.find((source) => source.id === "supabase").status, "adapter_not_implemented");
});

test("Supabase environment configuration does not enable cross-project data access", () => {
  const status = getProjectIntelligenceStatus({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "placeholder"
  });
  const supabase = status.sources.find((source) => source.id === "supabase");
  assert.equal(supabase.configured, true);
  assert.equal(supabase.status, "adapter_not_implemented");
  assert.match(supabase.note, /cross-project data access is not implemented/);
});
