/**
 * Snapshot-integrity + per-list redistribution record for the bundled X12
 * code-list snapshots.
 *
 * `scripts/refresh-code-lists.ts` is the release-event tool that validates the
 * bundled snapshots and, under `--fetch`, answers whether each may be
 * regenerated from its canonical source. Its validator runs here on every
 * `pnpm test` so a malformed snapshot - a bad ISO date in `meta`, an empty
 * description, a whitespace-variant duplicate code - fails CI immediately, not
 * only when a human runs the CLI before a release. A stale snapshot is fine (it
 * yields a missing description, never a wrong code); a *malformed* one is a bug.
 *
 * What this file adds beyond well-formedness:
 *
 * - **The terms and the maintainer are recorded PER LIST**, and the lists
 *   really do disagree, so one shared sentence could not have been right about
 *   both. A licence a consumer does not need and a restriction they must
 *   respect are hidden equally by a single answer.
 * - **An unsettled status is recorded as unsettled and refused anyway.** The
 *   failure this guards against is a list defaulting to permitted because
 *   nobody established otherwise.
 * - **An unlabelled list cannot reach a release**: validation fails and names
 *   the list.
 * - **One list's restriction never refuses another list.** Driven with
 *   synthetic target sets so the property is tested rather than observed on the
 *   one arrangement that ships today.
 */

import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

import {
  CARC,
  CLAIM_STATUS_CATEGORY_CODES,
  CLAIM_STATUS_CODES,
  CLP_STATUS,
  MAINTENANCE_TYPE_CODES,
  RARC,
  SERVICE_TYPE_CODES,
  codeListRedistributionIsPermitted,
} from "../../src/index.js";
import type { CodeListRedistribution, CodeListSnapshot } from "../../src/index.js";
import {
  TARGETS,
  regenerationPermissions,
  renderFetchReport,
  validateCodeLists,
  type RefreshTarget,
} from "../../scripts/refresh-code-lists.js";

const REPO_ROOT = process.cwd();
const TSX_BIN = join(REPO_ROOT, "node_modules", ".bin", "tsx");
const REFRESH_PATH = join(REPO_ROOT, "scripts", "refresh-code-lists.ts");

/** The three lists whose descriptions the carried sources say nothing about. */
const NOT_ESTABLISHED_IDS = ["SERVICE-TYPE", "CLP-STATUS", "MAINTENANCE-TYPE"] as const;

/** Build a target around an arbitrary meta, for the synthetic-set cases. */
function target(
  id: string,
  maintainingOrganization: string | undefined,
  redistribution: CodeListRedistribution | undefined,
): RefreshTarget {
  const snapshot: CodeListSnapshot = {
    meta: {
      id,
      description: `${id} control`,
      source: "a source",
      publishedDate: "2026-01-01",
      snapshotDate: "2026-01-02",
      maintainingOrganization,
      redistribution,
      completeness: "cited-subset",
    },
    codes: { "1": "a description" },
  };
  return { snapshot, cadence: "n/a", canonicalSource: `source-for-${id}` };
}

const PERMITTED: CodeListRedistribution = {
  status: "permitted",
  terms: "the maintainer publishes this list without a licence requirement",
  approach: undefined,
};
const LICENCE_REQUIRED: CodeListRedistribution = {
  status: "licence-required",
  terms: "the maintainer requires a purchased licence",
  approach: "The Licensor, at its published licensing page",
};
const NOT_ESTABLISHED: CodeListRedistribution = {
  status: "not-established",
  terms: "NOT ESTABLISHED. No source obtained for this package names this list.",
  approach: "The Maintainer, who must be asked",
};

describe("bundled code-list snapshots are well-formed", () => {
  it("every snapshot passes the refresh-code-lists validator", () => {
    expect(validateCodeLists()).toEqual([]);
  });
});

describe("AC-1: the terms and the maintainer are recorded per list, not as one review", () => {
  it("every bundled list carries its own maintainer and its own terms", () => {
    for (const { snapshot } of TARGETS) {
      const { meta } = snapshot;
      expect(meta.maintainingOrganization, `${meta.id} maintainer`).toBeTruthy();
      expect(meta.redistribution, `${meta.id} redistribution`).toBeDefined();
      expect(meta.redistribution?.terms.length ?? 0, `${meta.id} terms`).toBeGreaterThan(0);
    }
  });

  it("the recorded answers DIFFER between lists, so one shared sentence cannot be right", () => {
    // The non-vacuity of the whole change: if every list answered the same, a
    // single blocked review would have lost nothing.
    const maintainers = new Set(TARGETS.map((t) => t.snapshot.meta.maintainingOrganization));
    const statuses = new Set(TARGETS.map((t) => t.snapshot.meta.redistribution?.status));
    expect(maintainers.size).toBeGreaterThan(1);
    expect(statuses.size).toBeGreaterThan(1);
    // And the two the package leans on hardest are the two that disagree.
    expect(CARC.meta.maintainingOrganization).toBe("ASC X12");
    expect(CARC.meta.redistribution?.status).toBe("licence-required");
    expect(RARC.meta.maintainingOrganization).toBe("CMS");
    expect(RARC.meta.redistribution?.status).toBe("permitted");
  });

  it("each list's terms cite the source they were read off", () => {
    // Terms are quoted or cited from a retrieved source rather than asserted.
    expect(CARC.meta.redistribution?.terms).toContain(
      "require implementers to purchase a license before the coded concepts can be used",
    );
    expect(RARC.meta.redistribution?.terms).toContain("Code Systems Not Requiring Licenses");
    expect(RARC.meta.redistribution?.terms).toContain("maintained by CMS");
    for (const id of NOT_ESTABLISHED_IDS) {
      const found = TARGETS.find((t) => t.snapshot.meta.id === id);
      expect(found?.snapshot.meta.redistribution?.terms).toContain("NOT ESTABLISHED");
    }
  });
});

describe("AC-5: an unsettled status is recorded as unsettled and never read as a permission", () => {
  it("the three lists the sources do not settle say so, and name who to ask", () => {
    for (const id of NOT_ESTABLISHED_IDS) {
      const found = TARGETS.find((t) => t.snapshot.meta.id === id);
      expect(found, `${id} is a bundled target`).toBeDefined();
      const meta = found?.snapshot.meta;
      expect(meta?.redistribution?.status, id).toBe("not-established");
      expect(meta?.redistribution?.approach, id).toContain("ASC X12");
      expect(meta?.redistribution?.approach, id).toContain(
        "https://x12.org/products/licensing-program",
      );
    }
  });

  it("the permission predicate answers false for unsettled, restricted and unrecorded alike", () => {
    // The single decision point. Only a RECORDED permission is a permission.
    expect(codeListRedistributionIsPermitted(RARC.meta)).toBe(true);
    expect(codeListRedistributionIsPermitted(CARC.meta)).toBe(false);
    expect(codeListRedistributionIsPermitted(CLAIM_STATUS_CATEGORY_CODES.meta)).toBe(false);
    expect(codeListRedistributionIsPermitted(CLAIM_STATUS_CODES.meta)).toBe(false);
    expect(codeListRedistributionIsPermitted(SERVICE_TYPE_CODES.meta)).toBe(false);
    expect(codeListRedistributionIsPermitted(CLP_STATUS.meta)).toBe(false);
    expect(codeListRedistributionIsPermitted(MAINTENANCE_TYPE_CODES.meta)).toBe(false);
    // A list carrying NO record at all is not a permitted list either.
    expect(
      codeListRedistributionIsPermitted(target("UNRECORDED", "someone", undefined).snapshot.meta),
    ).toBe(false);
  });

  it("an unsettled list is refused by the regeneration report, exactly like a restricted one", () => {
    const permissions = regenerationPermissions([
      target("UNSETTLED", "The Maintainer", NOT_ESTABLISHED),
      target("RESTRICTED", "The Licensor", LICENCE_REQUIRED),
    ]);
    expect(permissions.map((p) => p.permitted)).toEqual([false, false]);
    expect(permissions[0]?.status).toBe("not-established");
    expect(permissions[0]?.approach).toBe("The Maintainer, who must be asked");
  });
});

describe("AC-6: an unlabelled list cannot reach a release", () => {
  it("a list with no maintaining organisation fails validation, named", () => {
    const errors = validateCodeLists([target("NO-MAINTAINER", undefined, PERMITTED)]);
    expect(errors).toContain("NO-MAINTAINER: meta.maintainingOrganization is not recorded");
  });

  it("an EMPTY maintaining organisation is a missing one, not a recorded one", () => {
    const errors = validateCodeLists([target("EMPTY-MAINTAINER", "", PERMITTED)]);
    expect(errors).toContain("EMPTY-MAINTAINER: meta.maintainingOrganization is not recorded");
  });

  it("a list with no redistribution status fails validation, named", () => {
    const errors = validateCodeLists([target("NO-TERMS", "someone", undefined)]);
    expect(errors).toContain(
      "NO-TERMS: meta.redistribution is not recorded (no redistribution status)",
    );
  });

  it("a restricted list naming no licensor fails validation, named", () => {
    // A refusal that names nobody is a dead end for the reader who hit it.
    const errors = validateCodeLists([
      target("NO-LICENSOR", "someone", { ...LICENCE_REQUIRED, approach: undefined }),
    ]);
    expect(errors).toContain(
      'NO-LICENSOR: redistribution status "licence-required" names no licensor to approach',
    );
  });

  it("every failure message names its own list, so a defect points at one list", () => {
    const errors = validateCodeLists([
      target("FIRST", undefined, undefined),
      target("SECOND", "someone", PERMITTED),
    ]);
    expect(errors.length).toBeGreaterThan(0);
    for (const e of errors) expect(e.startsWith("FIRST: ")).toBe(true);
  });

  it("CONTROL: a fully labelled list passes, so the checks above are not always-red", () => {
    expect(validateCodeLists([target("LABELLED", "someone", PERMITTED)])).toEqual([]);
  });
});

describe("AC-7: the regeneration path answers each list independently", () => {
  it("the bundled lists get one answer each, and only the permitted one is permitted", () => {
    const permissions = regenerationPermissions();
    expect(permissions.map((p) => p.id)).toEqual(TARGETS.map((t) => t.snapshot.meta.id));
    const permitted = permissions.filter((p) => p.permitted).map((p) => p.id);
    expect(permitted).toEqual(["RARC"]);
    for (const p of permissions.filter((x) => !x.permitted)) {
      expect(p.approach, `${p.id} names a licensor`).toBeTruthy();
    }
  });

  it("a permitted list's answer does not change when a restricted list sits beside it", () => {
    // The property AC-7 forbids breaking: no list is refused on account of
    // another list's restriction. Answered alone, and answered in company.
    const alone = regenerationPermissions([target("FREE", "The Maintainer", PERMITTED)]);
    const inCompany = regenerationPermissions([
      target("FREE", "The Maintainer", PERMITTED),
      target("RESTRICTED", "The Licensor", LICENCE_REQUIRED),
      target("UNSETTLED", "The Maintainer", NOT_ESTABLISHED),
    ]);
    expect(alone[0]?.permitted).toBe(true);
    expect(inCompany[0]).toEqual(alone[0]);
    expect(inCompany.map((p) => p.permitted)).toEqual([true, false, false]);
  });

  it("the report names every list, and names the licensor beside every refusal", () => {
    const report = renderFetchReport();
    for (const { snapshot } of TARGETS) expect(report).toContain(snapshot.meta.id);
    expect(report).toContain("PERMITTED");
    expect(report).toContain("REFUSED");
    expect(report).toContain("https://x12.org/products/licensing-program");
    // The sentence this change replaced: one refusal covering every list.
    expect(report).not.toContain("redistribution-terms review");
  });

  it("a report over only permitted lists refuses nothing at all", () => {
    const report = renderFetchReport(
      regenerationPermissions([
        target("FREE-1", "The Maintainer", PERMITTED),
        target("FREE-2", "Another Maintainer", PERMITTED),
      ]),
    );
    expect(report).not.toContain("REFUSED");
    expect(report).toContain("Every one of the 2 bundled lists may be regenerated");
  });

  it("the CLI prints the per-list report and exits 2 while any list is refused", () => {
    const r = spawnSync(TSX_BIN, [REFRESH_PATH, "--fetch"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      shell: false,
    });
    expect(r.status).toBe(2);
    const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    expect(out).toContain("RARC");
    expect(out).toContain("PERMITTED");
    expect(out).toContain("CARC");
    expect(out).toContain("licence-required");
    expect(out).toContain("not-established");
    // Refused BY NAME, and the permitted list is not among them.
    expect(out).toMatch(/bundled lists may not be regenerated here: /u);
    const refusalLine = /may not be regenerated here: ([^.]*)\./u.exec(out)?.[1] ?? "";
    expect(refusalLine).toContain("CARC");
    expect(refusalLine).not.toContain("RARC");
  });
});
