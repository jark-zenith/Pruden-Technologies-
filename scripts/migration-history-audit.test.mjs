import test from "node:test";
import assert from "node:assert/strict";
import { reconcileMigrationHistory } from "./migration-history-audit.mjs";

test("reports aligned versions and normalizes a redundant timestamp prefix in history names", () => {
  const report = reconcileMigrationHistory({
    repositoryFiles: ["20261112095508_ptms_hq_realtime.sql"],
    appliedMigrations: [{ version: "20261112095508", name: "20261112094500_ptms_hq_realtime" }]
  });
  assert.equal(report.status, "aligned");
  assert.equal(report.summary.sharedVersionCount, 1);
  assert.deepEqual(report.nameMismatches, []);
});

test("classifies repository-only and database-only versions without proposing writes", () => {
  const report = reconcileMigrationHistory({
    repositoryFiles: ["20261113204800_allow_awaiting_verification_task_status.sql"],
    appliedMigrations: [{ version: "20261112095508", name: "ptms_hq_realtime" }]
  });
  assert.equal(report.status, "review_required");
  assert.deepEqual(report.repositoryOnly.map((item) => item.version), ["20261113204800"]);
  assert.deepEqual(report.databaseOnly.map((item) => item.version), ["20261112095508"]);
  assert.equal("apply" in report, false);
});

test("reports semantic migration-name mismatches for shared versions", () => {
  const report = reconcileMigrationHistory({
    repositoryFiles: ["20261112095508_ptms_hq_realtime.sql"],
    appliedMigrations: [{ version: "20261112095508", name: "different_migration" }]
  });
  assert.equal(report.summary.nameMismatchCount, 1);
  assert.deepEqual(report.nameMismatches, [{
    version: "20261112095508",
    repositoryName: "ptms_hq_realtime",
    databaseName: "different_migration"
  }]);
});

test("reports duplicate versions and invalid SQL filenames", () => {
  const report = reconcileMigrationHistory({
    repositoryFiles: [
      "20261112095508_first.sql",
      "20261112095508_second.sql",
      "not-a-timestamp.sql"
    ],
    appliedMigrations: [
      { version: "20261112095508", name: "first" },
      { version: "20261112095508", name: "first" }
    ]
  });
  assert.equal(report.summary.duplicateRepositoryVersionCount, 1);
  assert.equal(report.summary.duplicateAppliedVersionCount, 1);
  assert.equal(report.summary.sharedVersionCount, 1);
  assert.equal(report.summary.invalidRepositoryFilenameCount, 1);
  assert.equal(report.status, "review_required");
});

test("rejects malformed applied migration history", () => {
  assert.throws(() => reconcileMigrationHistory({
    repositoryFiles: [],
    appliedMigrations: [{ version: "not-a-version", name: "bad" }]
  }), /version must contain 12 to 14 digits/);
});

test("surfaces same-name migrations recorded under different versions without treating them as equivalent", () => {
  const report = reconcileMigrationHistory({
    repositoryFiles: ["20261020190000_project_operations_center.sql"],
    appliedMigrations: [{ version: "20261020151346", name: "project_operations_center" }]
  });
  assert.deepEqual(report.sameNameDifferentVersion, [{
    name: "project_operations_center",
    repositoryVersion: "20261020190000",
    appliedVersion: "20261020151346"
  }]);
  assert.equal(report.status, "review_required");
});
