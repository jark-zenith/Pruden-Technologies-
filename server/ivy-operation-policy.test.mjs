import test from "node:test";
import assert from "node:assert/strict";
import { IVY_ALLOWED_OPERATION_NAMES } from "./ivy-operation-policy.mjs";

test("Ivy retains owner-scoped finance reads", () => {
  for (const name of [
    "list_finance_records",
    "get_finance_record",
    "get_finance_summary",
    "list_financial_accounts",
    "list_financial_transactions"
  ]) {
    assert.ok(IVY_ALLOWED_OPERATION_NAMES.has(name), name);
  }
});

test("Ivy cannot mutate finance records without an approval gateway", () => {
  for (const name of [
    "create_finance_record",
    "update_finance_record",
    "delete_finance_record",
    "manage_savings_goal"
  ]) {
    assert.equal(IVY_ALLOWED_OPERATION_NAMES.has(name), false, name);
  }
  assert.ok(IVY_ALLOWED_OPERATION_NAMES.has("request_approval"));
});

test("Ivy can read CRM records but cannot create customer records", () => {
  assert.ok(IVY_ALLOWED_OPERATION_NAMES.has("list_customers"));
  assert.equal(IVY_ALLOWED_OPERATION_NAMES.has("create_customer"), false);
});
