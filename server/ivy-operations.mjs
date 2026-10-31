import { createClient } from "@supabase/supabase-js";

const modules = [
  { name: "list_projects", description: "Read the founder's projects. Use before answering project-status questions.", input_schema: { type: "object", properties: { status: { type: "string", enum: ["planned","active","blocked","completed","archived"] } }, required: [] } },
  { name: "list_tasks", description: "Read the founder's tasks. Optional status filter.", input_schema: { type: "object", properties: { status: { type: "string", enum: ["planned","in_progress","blocked","completed","cancelled"] } }, required: [] } },
  { name: "list_approvals", description: "Read the founder's approval queue and statuses.", input_schema: { type: "object", properties: { status: { type: "string", enum: ["pending","approved","rejected","cancelled","executed"] } }, required: [] } },
  { name: "list_customers", description: "Read the founder's CRM customer and lead records. Never expose unnecessary personal details.", input_schema: { type: "object", properties: { status: { type: "string", enum: ["lead","active","inactive","archived"] } }, required: [] } },
  { name: "create_project", description: "Create a project in the founder's workspace. Only do this when the founder asks or clearly authorizes creating it.", input_schema: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, status: { type: "string", enum: ["planned","active","blocked","completed","archived"] }, priority: { type: "string", enum: ["low","medium","high","critical"] }, due_date: { type: ["string","null"] } }, required: ["name"] } },
  { name: "create_task", description: "Create a task in the founder's workspace. Only do this when asked or clearly authorized. project_id must be an existing project ID or null.", input_schema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, project_id: { type: ["string","null"] }, status: { type: "string", enum: ["planned","in_progress","blocked","completed","cancelled"] }, priority: { type: "string", enum: ["low","medium","high","critical"] }, assigned_to: { type: "string" }, due_date: { type: ["string","null"] } }, required: ["title"] } },
  { name: "update_task_status", description: "Change a task status for the founder. Use a task ID obtained from list_tasks; never guess IDs.", input_schema: { type: "object", properties: { id: { type: "string" }, status: { type: "string", enum: ["planned","in_progress","blocked","completed","cancelled"] } }, required: ["id","status"] } },
  { name: "create_customer", description: "Create a CRM lead/customer record. Only do this when asked or clearly authorized. Avoid inventing contact information.", input_schema: { type: "object", properties: { name: { type: "string" }, email: { type: ["string","null"] }, phone: { type: ["string","null"] }, organization: { type: ["string","null"] }, notes: { type: "string" }, status: { type: "string", enum: ["lead","active","inactive","archived"] } }, required: ["name"] } },

  { name: "list_finance_records", description: "Read the founder's actual Finance ledger. Supports kind/category/search/date filters and returns saved rows only.", input_schema: { type: "object", properties: { kind: { type: "string", enum: ["income","expense"] }, category: { type: "string" }, search: { type: "string" }, from_date: { type: "string" }, to_date: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 } }, required: [] } },
  { name: "list_financial_accounts", description: "Read the founder's registered personal and business accounts, including connection status and masked identifiers. Never expose credentials.", input_schema: { type: "object", properties: { account_scope: { type: "string", enum: ["personal","business"] }, status: { type: "string", enum: ["pending_setup","sandbox_ready","connected","paused","disconnected"] } }, required: [] } },
  { name: "list_financial_transactions", description: "Read normalized transactions with optional project, account, kind, status and date filters.", input_schema: { type: "object", properties: { project_id: { type: "string" }, account_id: { type: "string" }, kind: { type: "string", enum: ["income","expense","transfer_in","transfer_out","refund","fee","adjustment"] }, status: { type: "string", enum: ["pending","confirmed","recorded","failed","reversed","needs_review"] }, from_date: { type: "string" }, to_date: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 } }, required: [] } },
  { name: "get_finance_record", description: "Read one saved finance ledger record by exact ID from the signed-in owner's records.", input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "create_finance_record", description: "Create a real KES income or expense ledger record only when the founder explicitly asks. Do not use for capital allocations or savings goals.", input_schema: { type: "object", properties: { kind: { type: "string", enum: ["income","expense"] }, amount: { type: "number", exclusiveMinimum: 0 }, category: { type: "string" }, description: { type: "string" }, occurred_on: { type: "string" } }, required: ["kind","amount","category","description","occurred_on"] } },
  { name: "update_finance_record", description: "Update only the supplied fields on an existing finance record owned by the signed-in founder; preserve all omitted fields.", input_schema: { type: "object", properties: { id: { type: "string" }, kind: { type: "string", enum: ["income","expense"] }, amount: { type: "number", exclusiveMinimum: 0 }, category: { type: "string" }, description: { type: "string" }, occurred_on: { type: "string" } }, required: ["id"] } },
  { name: "delete_finance_record", description: "Permanently delete one finance record only when the founder explicitly instructs deletion and the exact target is unambiguous. Prefer archive if supported; this ledger has no archive field.", input_schema: { type: "object", properties: { id: { type: "string" }, confirm: { type: "boolean" } }, required: ["id","confirm"] } },
  { name: "get_finance_summary", description: "Calculate live totals from saved owner-scoped finance ledger rows for a date range; never treat capital allocations as income.", input_schema: { type: "object", properties: { from_date: { type: "string" }, to_date: { type: "string" } }, required: [] } },
  { name: "manage_savings_goal", description: "List, create, update, or archive a savings/capital goal. Allocations are separate capital amounts, not ledger income. Use action=list to inspect existing goals and reuse an equivalent goal instead of duplicating it.", input_schema: { type: "object", properties: { action: { type: "string", enum: ["list","create","update","archive"] }, id: { type: "string" }, name: { type: "string" }, description: { type: "string" }, currency: { type: "string", enum: ["KES"] }, target_amount: { type: "number", minimum: 0 }, mpesa_amount: { type: "number", minimum: 0 }, cash_amount: { type: "number", minimum: 0 }, due_date: { type: ["string","null"] }, status: { type: "string", enum: ["active","completed","paused","archived"] } }, required: ["action"] } },
  { name: "request_approval", description: "Create a pending approval record for a consequential action. This only records the request; it does not execute the action.", input_schema: { type: "object", properties: { action_type: { type: "string" }, target_type: { type: "string" }, target_id: { type: ["string","null"] }, summary: { type: "string" }, risk_level: { type: "string", enum: ["low","medium","high","critical"] } }, required: ["action_type","target_type","summary"] } }
];

const allowedTables = new Set(["pruden_projects", "pruden_tasks", "pruden_approvals", "pruden_customers"]);
const allowedStatuses = {
  pruden_projects: new Set(["planned","active","blocked","completed","archived"]),
  pruden_tasks: new Set(["planned","in_progress","blocked","completed","cancelled"]),
  pruden_approvals: new Set(["pending","approved","rejected","cancelled","executed"]),
  pruden_customers: new Set(["lead","active","inactive","archived"])
};

function cleanString(value, max, fallback = "") {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") throw new Error("Invalid text value.");
  const text = value.trim();
  if (text.length > max) throw new Error("Text exceeds the allowed length.");
  return text;
}
function validDate(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) throw new Error("Due date must use YYYY-MM-DD.");
  return value;
}
function requireEnum(value, values, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !values.includes(value)) throw new Error("Unsupported status or priority.");
  return value;
}
export const ivyOperationTools = modules;

export async function executeIvyOperation(name, input, accessToken) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Supabase server configuration is missing.");
  if (typeof accessToken !== "string" || accessToken.length < 20 || accessToken.length > 8192) throw new Error("Your signed-in session is required for workspace operations.");
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: "Bearer " + accessToken } } });
  const { data: authData, error: authError } = await client.auth.getUser(accessToken);
  if (authError || !authData?.user?.id) throw new Error("Your session could not be verified. Sign in again.");
  const ownerId = authData.user.id;
  const list = async (table, status) => {
    if (!allowedTables.has(table)) throw new Error("Unsupported data source.");
    let query = client.from(table).select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(50);
    if (status) {
      if (!allowedStatuses[table]?.has(status)) throw new Error("Unsupported status filter.");
      query = query.eq("status", status);
    }
    const { data, error } = await query;
    if (error) throw new Error("Workspace read failed: " + error.message);
    return data || [];
  };
  const validUuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const financeDate = (value, label = "Date") => {
    if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) throw new Error(label + " must use YYYY-MM-DD.");
    const parsed = new Date(value + "T00:00:00Z");
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(label + " is not a valid calendar date.");
    return value;
  };
  const financeAmount = (value, label, allowZero = false) => {
    if (typeof value !== "number" || !Number.isFinite(value) || (allowZero ? value < 0 : value <= 0) || value > 999999999999) throw new Error(label + (allowZero ? " must be zero or greater." : " must be greater than zero."));
    return Math.round(value * 100) / 100;
  };
  const financeGoalShape = (row) => ({ ...row, total_capital: Number(row.mpesa_amount || 0) + Number(row.cash_amount || 0), remaining_amount: Math.max(0, Number(row.target_amount || 0) - Number(row.mpesa_amount || 0) - Number(row.cash_amount || 0)), progress_percent: Number(row.target_amount || 0) > 0 ? Math.min(100, ((Number(row.mpesa_amount || 0) + Number(row.cash_amount || 0)) / Number(row.target_amount)) * 100) : 0 });
  const audit = async (action, type, id, details = {}) => {
    const { error } = await client.from("pruden_audit_events").insert({ owner_id: ownerId, actor_id: ownerId, action, entity_type: type, entity_id: String(id), details: { source: "ivy", ...details } });
    return error ? " The record changed, but the audit event could not be written; check audit permissions." : "";
  };
  if (name === "list_finance_records") {
    let query = client.from("pruden_financial_records").select("*").eq("owner_id", ownerId).order("occurred_on", { ascending: false }).limit(Math.min(100, Math.max(1, Number.isInteger(input.limit) ? input.limit : 50)));
    if (input.kind !== undefined) query = query.eq("kind", requireEnum(input.kind, ["income","expense"]));
    if (input.category !== undefined) query = query.ilike("category", "%" + cleanString(input.category, 100) + "%");
    if (input.from_date !== undefined) query = query.gte("occurred_on", financeDate(input.from_date, "Start date"));
    if (input.to_date !== undefined) query = query.lte("occurred_on", financeDate(input.to_date, "End date"));
    const { data, error } = await query;
    if (error) throw new Error("Finance read failed: " + error.message);
    const search = cleanString(input.search, 200).toLowerCase();
    return (data || []).filter((row) => !search || [row.category,row.description,row.external_reference].some((v) => String(v || "").toLowerCase().includes(search)));
  }
  if (name === "get_finance_record") {
    if (!validUuid(input.id)) throw new Error("Finance record ID is invalid.");
    const { data, error } = await client.from("pruden_financial_records").select("*").eq("id", input.id).eq("owner_id", ownerId).maybeSingle();
    if (error) throw new Error("Finance record read failed: " + error.message);
    if (!data) throw new Error("Finance record not found in your workspace.");
    return data;
  }
  if (name === "create_finance_record") {
    const row = { owner_id: ownerId, kind: requireEnum(input.kind, ["income","expense"]), amount: financeAmount(input.amount, "Amount"), currency: "KES", category: cleanString(input.category, 100), description: cleanString(input.description, 1000), occurred_on: financeDate(input.occurred_on, "Occurred-on date") };
    if (!row.category || !row.description) throw new Error("Finance category and description are required.");
    const { data, error } = await client.from("pruden_financial_records").insert(row).select("*").single();
    if (error) throw new Error("Finance record creation failed: " + error.message);
    return { status: "created", record: data, audit: await audit("finance.created", "pruden_financial_records", data.id, { kind: data.kind, amount: data.amount }) };
  }
  if (name === "update_finance_record") {
    if (!validUuid(input.id)) throw new Error("Finance record ID is invalid.");
    const patch = {};
    if (input.kind !== undefined) patch.kind = requireEnum(input.kind, ["income","expense"]);
    if (input.amount !== undefined) patch.amount = financeAmount(input.amount, "Amount");
    if (input.category !== undefined) { patch.category = cleanString(input.category, 100); if (!patch.category) throw new Error("Category is required."); }
    if (input.description !== undefined) { patch.description = cleanString(input.description, 1000); if (!patch.description) throw new Error("Description is required."); }
    if (input.occurred_on !== undefined) patch.occurred_on = financeDate(input.occurred_on, "Occurred-on date");
    if (!Object.keys(patch).length) throw new Error("Provide at least one finance field to update.");
    patch.updated_at = new Date().toISOString();
    const { data, error } = await client.from("pruden_financial_records").update(patch).eq("id", input.id).eq("owner_id", ownerId).select("*").maybeSingle();
    if (error) throw new Error("Finance record update failed: " + error.message);
    if (!data) throw new Error("Finance record not found in your workspace.");
    return { status: "updated", record: data, audit: await audit("finance.updated", "pruden_financial_records", data.id, { fields: Object.keys(patch) }) };
  }
  if (name === "delete_finance_record") {
    if (!validUuid(input.id)) throw new Error("Finance record ID is invalid.");
    if (input.confirm !== true) throw new Error("Deletion requires confirm=true after the founder explicitly authorizes deleting this exact record.");
    const { data, error } = await client.from("pruden_financial_records").delete().eq("id", input.id).eq("owner_id", ownerId).select("id,kind,amount,category,description").maybeSingle();
    if (error) throw new Error("Finance record deletion failed: " + error.message);
    if (!data) throw new Error("Finance record not found in your workspace.");
    return { status: "deleted", deleted_record: data, audit: await audit("finance.deleted", "pruden_financial_records", data.id, { kind: data.kind, amount: data.amount }) };
  }
  if (name === "get_finance_summary") {
    let query = client.from("pruden_financial_records").select("kind,amount,currency,occurred_on").eq("owner_id", ownerId).limit(10000);
    if (input.from_date !== undefined) query = query.gte("occurred_on", financeDate(input.from_date, "Start date"));
    if (input.to_date !== undefined) query = query.lte("occurred_on", financeDate(input.to_date, "End date"));
    const { data, error } = await query;
    if (error) throw new Error("Finance summary failed: " + error.message);
    const rows = data || [];
    const total = (kind) => rows.filter((r) => r.kind === kind).reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return { currency: "KES", record_count: rows.length, income_total: total("income"), expense_total: total("expense"), net_total: total("income") - total("expense"), from_date: input.from_date || null, to_date: input.to_date || null, source: "saved finance ledger records only; capital allocations excluded" };
  }
  if (name === "list_financial_accounts") {
    let query = client.from("pruden_financial_accounts").select("id,account_name,account_type,account_scope,provider,currency,masked_identifier,status,is_active,last_synced_at,created_at").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(100);
    if (input.account_scope !== undefined) query = query.eq("account_scope", requireEnum(input.account_scope, ["personal","business"]));
    if (input.status !== undefined) query = query.eq("status", requireEnum(input.status, ["pending_setup","sandbox_ready","connected","paused","disconnected"]));
    const { data, error } = await query;
    if (error) throw new Error("Financial account read failed: " + error.message);
    return data || [];
  }
  if (name === "list_financial_transactions") {
    let query = client.from("pruden_financial_transactions").select("id,account_id,project_id,kind,amount,currency,category,description,occurred_at,source,status,verification_status,external_reference,project_reference,created_at").eq("owner_id", ownerId).order("occurred_at", { ascending: false }).limit(Math.min(100, Math.max(1, Number.isInteger(input.limit) ? input.limit : 50)));
    if (input.project_id !== undefined) { if (!validUuid(input.project_id)) throw new Error("Project ID is invalid."); query = query.eq("project_id", input.project_id); }
    if (input.account_id !== undefined) { if (!validUuid(input.account_id)) throw new Error("Account ID is invalid."); query = query.eq("account_id", input.account_id); }
    if (input.kind !== undefined) query = query.eq("kind", requireEnum(input.kind, ["income","expense","transfer_in","transfer_out","refund","fee","adjustment"]));
    if (input.status !== undefined) query = query.eq("status", requireEnum(input.status, ["pending","confirmed","recorded","failed","reversed","needs_review"]));
    if (input.from_date !== undefined) query = query.gte("occurred_at", financeDate(input.from_date, "Start date") + "T00:00:00.000Z");
    if (input.to_date !== undefined) query = query.lte("occurred_at", financeDate(input.to_date, "End date") + "T23:59:59.999Z");
    const { data, error } = await query;
    if (error) throw new Error("Financial transaction read failed: " + error.message);
    return data || [];
  }
  if (name === "manage_savings_goal") {
    const action = requireEnum(input.action, ["list","create","update","archive"]);
    if (action === "list") {
      const { data, error } = await client.from("pruden_savings_goals").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(100);
      if (error) throw new Error("Savings goals read failed: " + error.message);
      return (data || []).map(financeGoalShape);
    }
    const id = input.id === undefined ? null : input.id;
    if ((action === "update" || action === "archive") && !validUuid(id)) throw new Error("Savings goal ID is invalid.");
    if (action === "archive") {
      const { data, error } = await client.from("pruden_savings_goals").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", ownerId).select("*").maybeSingle();
      if (error) throw new Error("Savings goal archive failed: " + error.message);
      if (!data) throw new Error("Savings goal not found in your workspace.");
      return { status: "archived", goal: financeGoalShape(data), audit: await audit("savings_goal.archived", "pruden_savings_goals", id) };
    }
    const patch = {};
    if (input.name !== undefined) { patch.name = cleanString(input.name, 160); if (!patch.name) throw new Error("Goal name is required."); }
    if (input.description !== undefined) patch.description = cleanString(input.description, 1000);
    if (input.currency !== undefined && input.currency !== "KES") throw new Error("Only KES is currently supported for savings goals.");
    if (input.target_amount !== undefined) patch.target_amount = financeAmount(input.target_amount, "Target amount", true);
    if (input.mpesa_amount !== undefined) patch.mpesa_amount = financeAmount(input.mpesa_amount, "M-PESA allocation", true);
    if (input.cash_amount !== undefined) patch.cash_amount = financeAmount(input.cash_amount, "Cash allocation", true);
    if (input.due_date !== undefined) patch.due_date = input.due_date === null ? null : financeDate(input.due_date, "Goal due date");
    if (input.status !== undefined) patch.status = requireEnum(input.status, ["active","completed","paused","archived"]);
    if (action === "create") {
      if (!patch.name || patch.target_amount === undefined) throw new Error("Goal name and target_amount are required.");
      const row = { owner_id: ownerId, currency: "KES", description: "", mpesa_amount: 0, cash_amount: 0, status: "active", ...patch };
      const { data, error } = await client.from("pruden_savings_goals").insert(row).select("*").single();
      if (error) throw new Error("Savings goal creation failed: " + error.message);
      return { status: "created", goal: financeGoalShape(data), audit: await audit("savings_goal.created", "pruden_savings_goals", data.id) };
    }
    if (!Object.keys(patch).length) throw new Error("Provide at least one goal field to update.");
    patch.updated_at = new Date().toISOString();
    const { data, error } = await client.from("pruden_savings_goals").update(patch).eq("id", id).eq("owner_id", ownerId).select("*").maybeSingle();
    if (error) throw new Error("Savings goal update failed: " + error.message);
    if (!data) throw new Error("Savings goal not found in your workspace.");
    return { status: "updated", goal: financeGoalShape(data), audit: await audit("savings_goal.updated", "pruden_savings_goals", id, { fields: Object.keys(patch) }) };
  }
  if (name === "list_projects") return await list("pruden_projects", input.status);
  if (name === "list_tasks") return await list("pruden_tasks", input.status);
  if (name === "list_approvals") return await list("pruden_approvals", input.status);
  if (name === "list_customers") return await list("pruden_customers", input.status);
  if (name === "create_project") {
    const row = { owner_id: ownerId, name: cleanString(input.name, 120), description: cleanString(input.description, 4000), status: requireEnum(input.status, [...allowedStatuses.pruden_projects], "planned"), priority: requireEnum(input.priority, ["low","medium","high","critical"], "medium"), due_date: validDate(input.due_date) };
    if (!row.name) throw new Error("Project name is required.");
    const { data, error } = await client.from("pruden_projects").insert(row).select("*").single();
    if (error) throw new Error("Project creation failed: " + error.message);
    return { created: data, audit: await audit("project.created", "project", data.id) };
  }
  if (name === "create_task") {
    const row = { owner_id: ownerId, title: cleanString(input.title, 200), description: cleanString(input.description, 4000), project_id: input.project_id || null, status: requireEnum(input.status, [...allowedStatuses.pruden_tasks], "planned"), priority: requireEnum(input.priority, ["low","medium","high","critical"], "medium"), assigned_to: cleanString(input.assigned_to, 160, "Unassigned"), due_date: validDate(input.due_date) };
    if (!row.title) throw new Error("Task title is required.");
    if (row.project_id) {
      const { data: project, error: projectError } = await client.from("pruden_projects").select("id").eq("id", row.project_id).eq("owner_id", ownerId).maybeSingle();
      if (projectError || !project) throw new Error("Project ID was not found in your workspace.");
    }
    const { data, error } = await client.from("pruden_tasks").insert(row).select("*").single();
    if (error) throw new Error("Task creation failed: " + error.message);
    return { created: data, audit: await audit("task.created", "task", data.id) };
  }
  if (name === "update_task_status") {
    const id = cleanString(input.id, 80);
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Task ID is invalid.");
    const status = requireEnum(input.status, [...allowedStatuses.pruden_tasks]);
    const { data, error } = await client.from("pruden_tasks").update({ status }).eq("id", id).eq("owner_id", ownerId).select("*").maybeSingle();
    if (error) throw new Error("Task update failed: " + error.message);
    if (!data) throw new Error("Task not found in your workspace.");
    return { updated: data, audit: await audit("task.status_changed", "task", id, { status }) };
  }
  if (name === "create_customer") {
    const row = { owner_id: ownerId, name: cleanString(input.name, 160), email: cleanString(input.email, 320) || null, phone: cleanString(input.phone, 50) || null, organization: cleanString(input.organization, 200) || null, notes: cleanString(input.notes, 4000), status: requireEnum(input.status, [...allowedStatuses.pruden_customers], "lead") };
    if (!row.name) throw new Error("Customer/lead name is required.");
    const { data, error } = await client.from("pruden_customers").insert(row).select("id,name,email,phone,organization,notes,status,created_at").single();
    if (error) throw new Error("Customer creation failed: " + error.message);
    return { created: data, audit: await audit("customer.created", "customer", data.id) };
  }
  if (name === "request_approval") {
    const row = { owner_id: ownerId, action_type: cleanString(input.action_type, 80), target_type: cleanString(input.target_type, 80), target_id: input.target_id ? cleanString(input.target_id, 80) : null, summary: cleanString(input.summary, 500), risk_level: requireEnum(input.risk_level, ["low","medium","high","critical"], "medium"), status: "pending", requested_by: "Ivy" };
    if (!row.action_type || !row.target_type || !row.summary) throw new Error("Approval action type, target type and summary are required.");
    const { data, error } = await client.from("pruden_approvals").insert(row).select("*").single();
    if (error) throw new Error("Approval request failed: " + error.message);
    return { created: data, note: "Pending approval only; no external action was executed.", audit: await audit("approval.requested", "approval", data.id) };
  }
  throw new Error("Ivy operation is not allowlisted.");
}
