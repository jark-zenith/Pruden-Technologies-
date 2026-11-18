import test from "node:test";
import assert from "node:assert/strict";
import { ivyCapabilityStatus } from "./ivy-capabilities.mjs";

test("a ChatGPT-side Composio key does not imply a PTMS server adapter", () => {
  const previous = process.env.COMPOSIO_API_KEY;
  process.env.COMPOSIO_API_KEY = "test-only-placeholder";
  try {
    const capability = ivyCapabilityStatus().composio;
    assert.equal(capability.status, "not_implemented");
    assert.equal(capability.serverSideAdapterInstalled, false);
    assert.equal(capability.toolExecutionEnabled, false);
    assert.equal(capability.ptmsOwnedConnectionRequired, true);
    assert.match(capability.note, /ChatGPT-side Composio connections are not inherited by PTMS/i);
  } finally {
    if (previous === undefined) delete process.env.COMPOSIO_API_KEY;
    else process.env.COMPOSIO_API_KEY = previous;
  }
});
