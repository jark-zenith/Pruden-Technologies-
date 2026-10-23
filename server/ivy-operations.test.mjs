import test from "node:test";
import assert from "node:assert/strict";
import { ivyOperationTools } from "./ivy-operations.mjs";

const byName = new Map(ivyOperationTools.map((tool) => [tool.name, tool]));

test("Ivy persistent memory tools are registered with bounded schemas", () => {
  for (const name of ["search_ivy_memory", "save_ivy_memory", "update_ivy_memory_status"]) {
    assert.ok(byName.has(name), `missing tool: ${name}`);
  }
  assert.deepEqual(byName.get("save_ivy_memory").input_schema.required, ["memory_type", "title", "content"]);
  assert.ok(byName.get("save_ivy_memory").input_schema.properties.content.maxLength <= 6000);
  assert.ok(byName.get("search_ivy_memory").input_schema.properties.status.enum.includes("active"));
});

test("verified-result memory requires evidence at the tool schema level", () => {
  const schema = byName.get("save_ivy_memory").input_schema;
  assert.ok(schema.properties.source.enum.includes("verified_tool_result"));
  assert.ok(schema.properties.memory_type.enum.includes("verified_result"));
  assert.ok(schema.properties.evidence.maxLength <= 1000);
});

test("memory status changes do not expose a delete operation", () => {
  assert.ok(byName.has("update_ivy_memory_status"));
  assert.equal(byName.has("delete_ivy_memory"), false);
});
