function statusOf(source, fallback = "unknown") {
  return typeof source?.status === "string" && source.status.length <= 80
    ? source.status
    : fallback;
}

function configuredOf(source) {
  if (typeof source?.configured === "boolean") return source.configured;
  const status = statusOf(source);
  return status === "configured_unverified" || status === "live_verified";
}

function countRegisteredAgents(directory) {
  const ivyCount = directory?.ivy?.id ? 1 : 0;
  const specialistCount = Array.isArray(directory?.departments)
    ? directory.departments.reduce((total, department) => total + (Array.isArray(department?.agents) ? department.agents.length : 0), 0)
    : 0;
  return ivyCount + specialistCount;
}

/**
 * Build an authenticated operational snapshot from local runtime/configuration state.
 * This function does not probe providers, query databases, or return credentials.
 */
export function buildOperationalHealthSnapshot({
  workforceDirectory = {},
  githubCapability = {},
  researchCapability = {},
  projectIntelligence = {},
  composioCapability = null,
  now = () => new Date()
} = {}) {
  const generatedAtValue = now();
  const generatedAtDate = generatedAtValue instanceof Date ? generatedAtValue : new Date(generatedAtValue);
  if (Number.isNaN(generatedAtDate.getTime())) throw new TypeError("now must return a valid date.");

  const sources = new Map(
    (Array.isArray(projectIntelligence?.sources) ? projectIntelligence.sources : [])
      .filter(source => typeof source?.id === "string")
      .map(source => [source.id, source])
  );
  const github = Object.keys(githubCapability || {}).length ? githubCapability : (sources.get("github") || {});
  const render = sources.get("render") || {};
  const supabase = sources.get("supabase") || {};
  const composio = composioCapability || {};
  const controls = workforceDirectory?.controls || {};

  return {
    generatedAt: generatedAtDate.toISOString(),
    service: {
      status: "alive",
      livenessEndpoint: "/health"
    },
    readiness: {
      status: "limited",
      readyForPersistentMissionExecution: false,
      blockers: [
        "The mission contract is not integrated into specialist execution.",
        "Persistent mission/run storage and the execution ledger are not implemented.",
        "The PTMS-owned Composio execution adapter is not implemented."
      ]
    },
    workforce: {
      registeredAgents: countRegisteredAgents(workforceDirectory),
      policySwitches: {
        toolsEnabled: controls.toolsEnabled === true,
        externalActionsEnabled: controls.externalActionsEnabled === true
      },
      runtimeHistory: "process_memory",
      persistentRunHistory: false
    },
    missionExecution: {
      status: "not_ready",
      contractDefined: true,
      runtimeIntegrated: false,
      persistentStore: "not_implemented",
      executionLedger: "not_implemented",
      runtimeActivityBuffer: "process_memory_only",
      independentVerification: "contract_only"
    },
    integrations: {
      github: {
        status: statusOf(github),
        configured: configuredOf(github),
        verified: github.verified === true,
        writePolicyConfigured: github.writeToolsEnabled === true
      },
      research: {
        status: statusOf(researchCapability),
        configured: configuredOf(researchCapability),
        liveSearchTested: researchCapability.liveSearchTested === true
      },
      render: {
        status: statusOf(render),
        configured: configuredOf(render),
        verified: render.verified === true
      },
      supabase: {
        status: statusOf(supabase),
        configured: configuredOf(supabase),
        verified: supabase.verified === true
      },
      composio: {
        status: statusOf(composio, "not_implemented"),
        serverSideAdapterInstalled: composio.serverSideAdapterInstalled === true,
        toolExecutionEnabled: composio.toolExecutionEnabled === true,
        ptmsOwnedConnectionRequired: composio.ptmsOwnedConnectionRequired !== false
      }
    }
  };
}
