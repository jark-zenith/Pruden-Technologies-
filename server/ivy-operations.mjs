import { createClient } from "@supabase/supabase-js";

const modules = [
  { name: "list_projects", description: "Read the founder's projects. Use before answering project-status questions.", input_schema: { type: "object", properties: { status: { type: "string", enum: ["planned","active","blocked","completed","archived"] } }, required: [] } },
  { name: "list_tasks", description: "Read the founder's tasks. Optional status filter.", input_schema: { type: "object", properties: { status: { type: "string", enum: ["planned","in_progress","blocked","completed","cancelled"] } }, required: [] } },
  { name: "list_approvals", description: "Read the founder's approval queue and statuses.", input_schema: { type: "object", properties: { status: { type: "string", enum: ["pending","approved","rejected","cancelled","executed"] } }, required: [] } },
  { name: "list_customers", description: "Read the founder's CRM customer and lead records. Never expose unnecessary personal details.", input_schema: { type: "object", properties: { status: { type: "string", enum: ["lead","active","inactive","archived"] } }, required: [] } },
  { name: "list_financial_records", description: "Read the signed-in founder's finance log, including capital, income/revenue and expenses. Use for finance questions and never treat entries as verified bank transactions.", input_schema: { type: "object", properties: { kind: { type: "string", enum: ["capital","income","expense"] }, from_date: { type: "string" }, to_date: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 } }, required: [] } },
  { name: "get_finance_summary", description: "Calculate totals for the signed-in founder's recorded capital, income/revenue and expenses over an optional date range. Results are based only on records in this workspace, not bank reconciliation.", input_schema: { type: "object", properties: { from_date: { type: "string" }, to_date: { type: "string" } }, required: [] } },
  { name: "create_financial_record", description: "Record a capital contribution, income/revenue, or expense in the signed-in founder's finance log. Only create when the founder explicitly asks. This logs a record only; it does not send or verify money. Confirm amount, kind, category and date are known; never invent financial details.", input_schema: { type: "object", properties: { kind: { type: "string", enum: ["capital","income","expense"] }, amount: { type: "number", exclusiveMinimum: 0 }, currency: { type: "string", enum: ["KES"] }, category: { type: "string" }, description: { type: "string" }, occurred_on: { type: "string", description: "YYYY-MM-DD" }, external_reference: { type: ["string","null"] } }, required: ["kind","amount","category"] } },
  { name: "create_project", description: "Create a project in the founder's workspace. Only do this when the founder asks or clearly authorizes creating it.", input_schema: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, status: { type: "string", enum: ["planned","active","blocked","completed","archived"] }, priority: { type: "string", enum: ["low","medium","high","critical"] }, due_date: { type: ["string","null"] } }, required: ["name"] } },
  { name: "create_task", description: "Create a task in the founder's workspace. Only do this when asked or clearly authorized. project_id must be an existing project ID or null.", input_schema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, project_id: { type: ["string","null"] }, status: { type: "string", enum: ["planned","in_progress","blocked","completed","cancelled"] }, priority: { type: "string", enum: ["low","medium","high","critical"] }, assigned_to: { type: "string" }, due_date: { type: ["string","null"] } }, required: ["title"] } },
  { name: "update_task_status", description: "Change a task status for the founder. Use a task ID obtained from list_tasks; never guess IDs.", input_schema: { type: "object", properties: { id: { type: "string" }, status: { type: "string", enum: ["planned","in_progress","blocked","completed","cancelled"] } }, required: ["id","status"] } },
  { name: "create_customer", description: "Create a CRM lead/customer record. Only do this when asked or clearly authorized. Avoid inventing contact information.", input_schema: { type: "object", properties: { name: { type: "string" }, email: { type: ["string","null"] }, phone: { type: ["string","null"] }, organization: { type: ["string","null"] }, notes: { type: "string" }, status: { type: "string", enum: ["lead","active","inactive","archived"] } }, required: ["name"] } },
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
  const audit = async (action, type, id, details = {}) => {
    const { error } = await client.from("pruden_audit_events").insert({ owner_id: ownerId, actor_id: ownerId, action, entity_type: type, entity_id: String(id), details: { source: "ivy", ...details } });
    return error ? " The record changed, but the audit event could not be written; check audit permissions." : "";
  };
  if (name === "list_projects") return await list("pruden_projects", input.status);
  if (name === "list_tasks") return await list("pruden_tasks", input.status);
  if (name === "list_approvals") return await list("pruden_approvals", input.status);
  if (name === "list_customers") return await list("pruden_customers", input.status);
  const financeDate = (value, label) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value) throw new Error(label + " must use a valid YYYY-MM-DD date.");
    return value;
  };
  const financeQuery = async (filters = {}) => {
    const fromDate = financeDate(filters.from_date, "Start date");
    const toDate = financeDate(filters.to_date, "End date");
    if (fromDate && toDate && fromDate > toDate) throw new Error("Start date must not be after end date.");
    let query = client.from("pruden_financial_records").select("id,kind,amount,currency,category,description,occurred_on,source,external_reference,created_at,updated_at").eq("owner_id", ownerId).order("occurred_on", { ascending: false }).limit(Math.min(100, Math.max(1, Number(filters.limit) || 100)));
    if (filters.kind) {
      if (!["capital","income","expense"].includes(filters.kind)) throw new Error("Unsupported finance record type.");
      query = query.eq("kind", filters.kind);
    }
    if (fromDate) query = query.gte("occurred_on", fromDate);
    if (toDate) query = query.lte("occurred_on", toDate);
    const { data, error } = await query;
    if (error) throw new Error("Finance records could not be read: " + error.message);
    return data || [];
  };
  if (name === "list_financial_records") return await financeQuery(input);
  if (name === "get_finance_summary") {
    const records = await financeQuery({ ...input, limit: 100 });
    const totals = { capital: 0, income: 0, expense: 0, currency: "KES", records_count: records.length };
    for (const record of records) totals[record.kind] += Number(record.amount);
    totals.net_operating = Number((totals.income - totals.expense).toFixed(2));
    return { period: { from_date: financeDate(input.from_date, "Start date"), to_date: financeDate(input.to_date, "End date") }, totals, note: "Based on up to 100 most recent matching workspace records; not bank-verified or double-entry reconciled." };
  }
  if (name === "create_financial_record") {
    const kind = requireEnum(input.kind, ["capital","income","expense"]);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999999.99) throw new Error("Amount must be a positive number within the supported limit.");
    const currency = input.currency === undefined ? "KES" : requireEnum(input.currency, ["KES"]);
    const category = cleanString(input.category, 100);
    if (!category) throw new Error("Finance category is required.");
    const occurredOn = financeDate(input.occurred_on, "Transaction date") || new Date().toISOString().slice(0, 10);
    const description = cleanString(input.description, 2000);
    const externalReference = cleanString(input.external_reference, 200) || null;
    const row = { owner_id: ownerId, kind, amount: Number(amount.toFixed(2)), currency, category, description, occurred_on: occurredOn, source: "manual", external_reference: externalReference };
    const { data, error } = await client.from("pruden_financial_records").insert(row).select("id,kind,amount,currency,category,description,occurred_on,source,external_reference,created_at").single();
    if (error) throw new Error("Finance record creation failed: " + error.message);
    return { created: data, note: "Finance log entry saved. This does not move money, verify a payment, or reconcile bank records.", audit: await audit("finance.record_created", "financial_record", data.id, { kind, amount: data.amount, currency, category, occurred_on: occurredOn }) };
  }
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
