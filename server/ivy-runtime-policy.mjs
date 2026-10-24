export const IVY_RUNTIME_BUDGET = Object.freeze({
  maxModelCallsPerRequest: 4,
  maxOutputTokensPerCall: 1800,
  maxOutputTokensPerRequest: 7200,
  maxInputCharactersPerRequest: 48000,
  maxSpecialistRunsPerRequest: 3,
  maxExecutionMsPerRequest: 120000,
  maxModelCallMs: 45000
});

export const SPECIALIST_RUNTIME_BUDGET = Object.freeze({
  maxModelCallsPerRun: 4,
  maxOutputTokensPerCall: 1200,
  maxOutputTokensPerRun: 4800,
  maxToolCallsPerRun: 4,
  maxExecutionMsPerRun: 120000,
  maxModelCallMs: 45000
});

export const GROUP_RUNTIME_BUDGET = Object.freeze({
  maxModelCallsPerRequest: 4,
  maxOutputTokensPerCall: 1600,
  maxOutputTokensPerRequest: 6400,
  maxExecutionMsPerRequest: 120000,
  maxModelCallMs: 45000
});

export function validateWorkforceRegistry(registry) {
  const errors = [];
  if (!registry || typeof registry !== "object") return ["Registry must be an object."];
  if (!Array.isArray(registry.departments)) return ["Registry departments must be an array."];
  if (registry.departments.length !== 6) errors.push(`Expected 6 departments; found ${registry.departments.length}.`);
  const agents = [
    ...(registry.ivy ? [{ ...registry.ivy, department: "Executive Office" }] : []),
    ...registry.departments.flatMap(department =>
      (Array.isArray(department.agents) ? department.agents : []).map(agent => ({ ...agent, department: department.name, departmentId: department.id }))
    )
  ];
  const ids = agents.map(agent => agent.id);
  if (agents.length !== 14) errors.push(`Expected 14 registered identities; found ${agents.length}.`);
  if (new Set(ids).size !== ids.length) errors.push("Agent IDs must be unique.");
  for (const id of ["ivy", "atlas", "nova", "echo", "mira", "forge", "pixel", "stack", "vector", "sentinel", "lumi", "motion", "relay", "vault"]) {
    if (!ids.includes(id)) errors.push(`Missing required agent: ${id}.`);
  }
  if (registry.chiefOfStaff !== "ivy") errors.push("Ivy must remain the chief of staff.");
  for (const department of registry.departments) {
    const memberIds = (department.agents || []).map(agent => agent.id);
    if (!memberIds.includes(department.lead)) errors.push(`Department lead ${department.lead} is not a member of ${department.id}.`);
  }
  const known = new Set([...ids, "founder"]);
  for (const agent of agents) {
    if (agent.reportsTo && !known.has(agent.reportsTo)) errors.push(`Unknown reportsTo identity ${agent.reportsTo} for ${agent.id}.`);
  }
  const securityDepartment = registry.departments.find(department => (department.agents || []).some(agent => agent.id === "sentinel"));
  if (!securityDepartment?.independent) errors.push("Sentinel's QA/security department must be marked independent.");
  return errors;
}
