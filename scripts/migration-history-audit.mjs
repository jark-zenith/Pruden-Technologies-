import { basename, resolve } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const MIGRATION_FILENAME = /^(\d{12,14})_(.+)\.sql$/i;
const MIGRATION_VERSION = /^\d{12,14}$/;

function normalizeMigrationName(value) {
  return String(value ?? "")
    .replace(/^\d{12,14}_/, "")
    .replace(/\.sql$/i, "")
    .trim();
}

function duplicateVersions(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    const current = grouped.get(entry.version) ?? [];
    current.push(entry);
    grouped.set(entry.version, current);
  }
  return [...grouped.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([version, values]) => ({
      version,
      entries: values.map(({ name, file }) => file ?? name)
    }))
    .sort((a, b) => a.version.localeCompare(b.version));
}

/**
 * Compare repository migration filenames with a read-only Supabase migration-history export.
 * This function never applies, repairs, or deletes migrations.
 */
export function reconcileMigrationHistory({ repositoryFiles, appliedMigrations }) {
  if (!Array.isArray(repositoryFiles)) throw new TypeError("repositoryFiles must be an array.");
  if (!Array.isArray(appliedMigrations)) throw new TypeError("appliedMigrations must be an array.");

  const sqlFiles = repositoryFiles
    .filter((file) => typeof file === "string" && file.toLowerCase().endsWith(".sql"))
    .map((file) => basename(file));
  const parsedRepository = sqlFiles.map((file) => {
    const match = file.match(MIGRATION_FILENAME);
    return match
      ? { version: match[1], name: match[2], file }
      : { file, reason: "filename_must_be_timestamp_name_sql" };
  });
  const validRepository = parsedRepository.filter((entry) => entry.version);
  const invalidRepositoryFiles = parsedRepository
    .filter((entry) => !entry.version)
    .map(({ file, reason }) => ({ file, reason }));

  const normalizedApplied = appliedMigrations.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new TypeError("appliedMigrations[" + index + "] must be an object.");
    }
    const version = String(entry.version ?? "");
    if (!MIGRATION_VERSION.test(version)) {
      throw new TypeError("appliedMigrations[" + index + "].version must contain 12 to 14 digits.");
    }
    const name = normalizeMigrationName(entry.name);
    if (!name) throw new TypeError("appliedMigrations[" + index + "].name must be non-empty.");
    return { version, name };
  });

  const repositoryByVersion = new Map();
  for (const entry of validRepository) {
    if (!repositoryByVersion.has(entry.version)) repositoryByVersion.set(entry.version, entry);
  }
  const appliedByVersion = new Map();
  for (const entry of normalizedApplied) {
    if (!appliedByVersion.has(entry.version)) appliedByVersion.set(entry.version, entry);
  }

  const repositoryOnly = validRepository
    .filter((entry) => !appliedByVersion.has(entry.version))
    .map(({ version, name, file }) => ({ version, name, file }))
    .sort((a, b) => a.version.localeCompare(b.version));
  const databaseOnly = normalizedApplied
    .filter((entry) => !repositoryByVersion.has(entry.version))
    .map(({ version, name }) => ({ version, name }))
    .sort((a, b) => a.version.localeCompare(b.version));

  const appliedByName = new Map();
  for (const entry of normalizedApplied) {
    const current = appliedByName.get(entry.name) ?? [];
    current.push(entry);
    appliedByName.set(entry.name, current);
  }
  const sameNameDifferentVersion = validRepository.flatMap((entry) => {
    const normalizedName = normalizeMigrationName(entry.name);
    return (appliedByName.get(normalizedName) ?? [])
      .filter((applied) => applied.version !== entry.version)
      .map((applied) => ({
        name: normalizedName,
        repositoryVersion: entry.version,
        appliedVersion: applied.version
      }));
  }).sort((a, b) => a.name.localeCompare(b.name) ||
    a.repositoryVersion.localeCompare(b.repositoryVersion) ||
    a.appliedVersion.localeCompare(b.appliedVersion));

  const nameMismatches = validRepository
    .filter((entry) => appliedByVersion.has(entry.version))
    .map((entry) => ({
      version: entry.version,
      repositoryName: normalizeMigrationName(entry.name),
      databaseName: appliedByVersion.get(entry.version).name
    }))
    .filter((entry) => entry.repositoryName !== entry.databaseName)
    .sort((a, b) => a.version.localeCompare(b.version));

  const duplicateRepositoryVersions = duplicateVersions(validRepository);
  const duplicateAppliedVersions = duplicateVersions(normalizedApplied);
  const status = repositoryOnly.length || databaseOnly.length || nameMismatches.length ||
    duplicateRepositoryVersions.length || duplicateAppliedVersions.length || invalidRepositoryFiles.length
    ? "review_required"
    : "aligned";

  return {
    schemaVersion: 1,
    status,
    summary: {
      repositorySqlFileCount: sqlFiles.length,
      validRepositoryMigrationCount: validRepository.length,
      appliedMigrationCount: normalizedApplied.length,
      sharedVersionCount: new Set(validRepository.filter((entry) => appliedByVersion.has(entry.version)).map((entry) => entry.version)).size,
      repositoryOnlyCount: repositoryOnly.length,
      databaseOnlyCount: databaseOnly.length,
      nameMismatchCount: nameMismatches.length,
      sameNameDifferentVersionCount: sameNameDifferentVersion.length,
      duplicateRepositoryVersionCount: duplicateRepositoryVersions.length,
      duplicateAppliedVersionCount: duplicateAppliedVersions.length,
      invalidRepositoryFilenameCount: invalidRepositoryFiles.length
    },
    repositoryOnly,
    databaseOnly,
    nameMismatches,
    sameNameDifferentVersion,
    duplicateRepositoryVersions,
    duplicateAppliedVersions,
    invalidRepositoryFiles
  };
}

async function runCli() {
  const historyFlag = process.argv.indexOf("--history-file");
  if (historyFlag < 0 || !process.argv[historyFlag + 1]) {
    console.error("Usage: node scripts/migration-history-audit.mjs --history-file <read-only-history.json> [--migration-dir <directory>]");
    process.exitCode = 2;
    return;
  }

  const migrationDirFlag = process.argv.indexOf("--migration-dir");
  const migrationDir = resolve(migrationDirFlag >= 0 && process.argv[migrationDirFlag + 1]
    ? process.argv[migrationDirFlag + 1]
    : "supabase/migrations");
  const historyPath = resolve(process.argv[historyFlag + 1]);
  const historyPayload = JSON.parse(await readFile(historyPath, "utf8"));
  const appliedMigrations = Array.isArray(historyPayload) ? historyPayload : historyPayload?.migrations;
  if (!Array.isArray(appliedMigrations)) {
    throw new TypeError("History JSON must be an array or an object containing a migrations array.");
  }

  const repositoryFiles = await readdir(migrationDir);
  const report = reconcileMigrationHistory({ repositoryFiles, appliedMigrations });
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "aligned") process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
