import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ALL_WARNING_MESSAGES } from "../src/index.js";

/**
 * Packaging gate: a shipped warning message may not send a consumer to a file the
 * tarball does not contain.
 *
 * `X12_837_SERVICE_LINE_DROPPED` and `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` both carry
 * "see KNOWN-LIMITATIONS.md" (one clause before each message closes, not at its end - both
 * end by sending the reader to `tx.segments`), and `KNOWN-LIMITATIONS.md` was absent from
 * `package.json`'s `files`, so an installed copy of this package carried a runtime message
 * naming a document that was not beside it. The document is the canonical account of what
 * this reader does not reproduce, and a consumer holding only a code, a `position` and a
 * message is exactly the consumer who needs it, so the citation is right and the packaging
 * was wrong.
 *
 * **BOTH HALVES ARE ASSERTED, because either alone can be satisfied while a consumer still
 * cannot read the file:** the name must be in `files`, AND a file of that name must exist at
 * the repo root. A `files` entry naming nothing publishes nothing.
 *
 * **Read the scope literally.** This scans the shipped warning registry and nothing else:
 * not JSDoc, not source comments, and not the `build*` refusal templates, none of which a
 * consumer sees at runtime. A doc cited from one of those is outside this gate, deliberately
 * - widening it to source text would make it a syntactic scan of prose rather than a
 * statement about what the library says to its callers. It also reads the `files` ARRAY and
 * does not run `npm pack`, so it is a statement about the manifest rather than about a built
 * tarball; a directory or glob entry that happens to cover a cited file would be reported
 * here even though `npm pack` would ship it. No such entry exists today, and the failure
 * direction is a false refusal rather than a false pass.
 */
const root = join(import.meta.dirname, "..");

/**
 * A repo-root markdown file name, as a warning message would spell one.
 *
 * Deliberately NOT restricted to SHOUTY-case names: a message citing `cookbook.md` has the
 * same problem as one citing `KNOWN-LIMITATIONS.md`, and a case-sensitive pattern would let
 * the next one through in silence. A path separator is excluded so this matches a repo-root
 * name only, which is what a `files` entry of this shape is.
 */
const DOC_CITATION_RE = /(?<![\w/.-])([A-Za-z0-9][A-Za-z0-9._-]*\.md)\b/g;

/**
 * Every repo-root `.md` file named by any message in `messages`.
 *
 * Kept as a free function over its inputs so the negative control below can drive it with a
 * table this package does not ship. A gate that can only be run on the real data cannot be
 * shown to fail.
 */
function citedDocs(messages: Iterable<string>): ReadonlySet<string> {
  const cited = new Set<string>();
  for (const message of messages) {
    for (const [, name] of message.matchAll(DOC_CITATION_RE)) {
      if (name !== undefined) cited.add(name);
    }
  }
  return cited;
}

/** The doc citations in `messages` that `files` does not put in the tarball. */
function uncitableDocs(messages: Iterable<string>, files: readonly string[]): readonly string[] {
  const shipped = new Set(files);
  return [...citedDocs(messages)].filter((name) => !shipped.has(name)).sort();
}

describe("a shipped warning message cites only files the tarball carries", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    files?: readonly string[];
  };

  it("every doc named in ALL_WARNING_MESSAGES is in package.json files", () => {
    expect(uncitableDocs(ALL_WARNING_MESSAGES, pkg.files ?? [])).toEqual([]);
  });

  it("every doc named in ALL_WARNING_MESSAGES exists at the repo root", () => {
    // The other half. A `files` entry naming a file that is not there publishes nothing, and
    // the membership check above cannot see that.
    const missing = [...citedDocs(ALL_WARNING_MESSAGES)].filter(
      (name) => !existsSync(join(root, name)),
    );
    expect(missing).toEqual([]);
  });

  it("the registry does cite a doc, so the assertion above is not vacuous", () => {
    // If the messages stop naming any document the check passes for the wrong reason. Pin
    // that they name one, and that it is the one this gate was written for.
    expect([...citedDocs(ALL_WARNING_MESSAGES)]).toContain("KNOWN-LIMITATIONS.md");
  });

  it("KNOWN-LIMITATIONS.md is in files, named rather than inferred", () => {
    expect(pkg.files).toContain("KNOWN-LIMITATIONS.md");
  });

  it("CONTROL: a citation missing from files is reported, by name", () => {
    // The red control. Without this the two assertions above could both be satisfied by a
    // helper that never returns anything.
    expect(uncitableDocs(["read NOT-SHIPPED.md before trusting this"], ["README.md"])).toEqual([
      "NOT-SHIPPED.md",
    ]);
  });

  it("CONTROL: a cited doc that IS in files is not reported", () => {
    expect(uncitableDocs(["read README.md first"], ["README.md"])).toEqual([]);
  });
});
