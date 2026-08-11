/**
 * `X12-PRE-005010-RUNTIME-MESSAGE`: `WARNING_MESSAGES.X12_PRE_005010` asserted
 * "ISA-12 declares a version other than the HIPAA baseline `00501`". The guard
 * behind it tests the twelfth element of the ISA split, which is not the same
 * thing: on an interchange whose ISA element area carries an extra element
 * separator the header does not split into `ISA` plus 16 elements, so the
 * element the guard reads need not be ISA-12, while ISA-12 at its own fixed
 * byte offset still reads `00501`.
 *
 * **This carrier is a RUNTIME VALUE, not a doc comment.** Every accuracy
 * finding in this repo's review history has been a claim in a prose carrier
 * that no test could fail on. A message string can be failed on, which is why
 * the census below is pinned rather than described: the cells are the
 * measurement, and this file states no rule over which ISA element is special.
 *
 * **No mechanism is named.** Fixed-width padding and arity displacement each
 * falsify a cell on their own, and the set of reasons is not published as
 * closed. The `ISA-13 carries *` row is the control that forbids the shortcut
 * "an extra separator falsifies the cell": it carries one and the code stays
 * silent.
 *
 * **Nothing was re-framed.** No guard, code, position or control flow moved;
 * this file also pins that the same interchanges raise the same codes at the
 * same positions as before.
 */

import { describe, expect, it } from "vitest";

import { ALL_WARNING_MESSAGES, WARNING_CODES, parseX12 } from "../src/index.js";
import { buildIsa, buildInterchange } from "./_helpers/envelope.js";

/**
 * Zero-indexed byte positions of the 16 ISA element separators, per
 * `DELIMITER_POSITIONS` / `detectDelimiters`.
 */
const SEPARATOR_POSITIONS = [3, 6, 17, 20, 31, 34, 50, 53, 69, 76, 81, 83, 89, 99, 101, 103];
/** The 16 fixed ISA element widths, ASC X12 .5. */
const ISA_WIDTHS = [2, 10, 2, 10, 2, 15, 2, 15, 6, 4, 1, 5, 9, 1, 1, 1];

/**
 * Read ISA element `n` (1-based) straight off the raw header at its own fixed
 * 005010 byte offset, independently of how the element split came out. This is
 * the reading the old message asserted about, and the only route back.
 */
function atFixedOffset(isaRaw: string, n: number): string {
  const start = (SEPARATOR_POSITIONS[n - 1] as number) + 1;
  return isaRaw.slice(start, start + (ISA_WIDTHS[n - 1] as number));
}

interface Cell {
  readonly label: string;
  readonly opts: Parameters<typeof buildInterchange>[0];
  /** ISA-12 read at its own fixed byte offset. */
  readonly isa12AtOffset: string;
  /** What the twelfth element of the split answers. */
  readonly element12: string;
  readonly fires: boolean;
}

const CELLS: readonly Cell[] = [
  { label: "spec-clean", opts: {}, isa12AtOffset: "00501", element12: "00501", fires: false },
  {
    label: "ISA-12 declares 00401",
    opts: { version: "00401" },
    isa12AtOffset: "00401",
    element12: "00401",
    fires: true,
  },
  {
    label: "ISA-05 carries `*`",
    opts: { senderQual: "Z*" },
    isa12AtOffset: "00501",
    element12: "^",
    fires: true,
  },
  {
    label: "ISA-06 carries `*`",
    opts: { senderId: "SENDER*ID" },
    isa12AtOffset: "00501",
    element12: "^",
    fires: true,
  },
  {
    label: "ISA-08 carries `*`",
    opts: { receiverId: "RECV*ID" },
    isa12AtOffset: "00501",
    element12: "^",
    fires: true,
  },
  {
    label: "ISA-13 carries `*`",
    opts: { controlNumber: "0000*0001" },
    isa12AtOffset: "00501",
    element12: "00501",
    fires: false,
  },
];

describe("X12_PRE_005010: the census the message has to survive", () => {
  for (const cell of CELLS) {
    it(`${cell.label}: ISA-12 at its fixed offset, elements[12], and whether the code fires`, () => {
      const ix = parseX12(buildInterchange(cell.opts));
      expect(atFixedOffset(buildIsa(cell.opts), 12)).toBe(cell.isa12AtOffset);
      expect(ix.isa.elements[12]).toBe(cell.element12);
      expect(ix.warnings.some((w) => w.code === WARNING_CODES.X12_PRE_005010)).toBe(cell.fires);
    });
  }

  it("the falsifying cells: the code fires while ISA-12 at its own fixed offset reads 00501", () => {
    const falsifying = CELLS.filter((c) => c.fires && c.isa12AtOffset === "00501");
    // More than one construction does this, and they are not the same element.
    expect(falsifying.length).toBeGreaterThan(1);
    for (const cell of falsifying) {
      const ix = parseX12(buildInterchange(cell.opts));
      const w = ix.warnings.find((x) => x.code === WARNING_CODES.X12_PRE_005010);
      expect(w).toBeDefined();
      // The message must NOT assert that ISA-12 declared something other than
      // the baseline, because on this very interchange it did not.
      expect(w?.message).not.toMatch(/ISA-12 declares/);
      expect(w?.message).not.toMatch(/declares a version (family )?other than/);
      // Nor may it call what it read "the declared version": same presupposition.
      expect(w?.message).not.toMatch(/[Tt]he declared version/);
    }
  });
});

describe("X12_PRE_005010: the message stays a registry value that echoes nothing", () => {
  it("the emitted message is a member of the exported registry", () => {
    const ix = parseX12(buildInterchange({ version: "00401" }));
    const w = ix.warnings.find((x) => x.code === WARNING_CODES.X12_PRE_005010);
    expect(w).toBeDefined();
    expect(ALL_WARNING_MESSAGES.has(w?.message ?? "")).toBe(true);
  });

  it("no consumer byte reaches the message: it is identical across different inputs", () => {
    const a = parseX12(buildInterchange({ version: "00401", senderId: "ACME" }));
    const b = parseX12(buildInterchange({ version: "00700", senderId: "ZENITH" }));
    const ma = a.warnings.find((x) => x.code === WARNING_CODES.X12_PRE_005010)?.message;
    const mb = b.warnings.find((x) => x.code === WARNING_CODES.X12_PRE_005010)?.message;
    expect(ma).toBeDefined();
    expect(ma).toBe(mb);
    for (const token of ["00401", "00700", "ACME", "ZENITH"]) {
      expect(ma).not.toContain(token);
    }
  });

  it("the position is unchanged: segment 0, interchange 0, element 12", () => {
    const ix = parseX12(buildInterchange({ version: "00401" }));
    const w = ix.warnings.find((x) => x.code === WARNING_CODES.X12_PRE_005010);
    expect(w?.position).toEqual({ segmentIndex: 0, interchangeIndex: 0, elementIndex: 12 });
  });
});
