/**
 * The machine-readable statement of which ASC X12 Technical Report Type 3
 * document this package implements, per transaction and per variant, and how
 * that identifier stands against the federal incorporation by reference at
 * 45 CFR 162.920.
 *
 * **Why this exists as data rather than prose.** A consumer integrating with a
 * payer that requires a named implementation guide on the wire needs to ask
 * the package what it implements, and needs its own build to fail when that
 * answer moves. A sentence in a README cannot be asserted on.
 *
 * **What the `cfrAdopted` column is, and what it is not.** It is the set of
 * identifiers 45 CFR 162.920 names for that transaction, read from the
 * official Government Publishing Office XML of the 2024 annual edition of
 * title 45, retrieved 2026-08-25. It is NOT a claim that the identifier this
 * package implements is the adopted one: where the two differ the row says so
 * in `adoption` and carries both, because replacing one with the other would
 * hide a real disagreement inside the federal corpus. Nothing here asserts
 * which reading a regulator would enforce.
 *
 * **It changes no parse and no emit behaviour.** It is a static description of
 * what the surrounding code already does.
 */

/**
 * A direction a transaction is implemented in: `read` when the package decodes
 * it into a typed model, `build` when the package emits it from one.
 *
 * @example
 * ```ts
 * import { X12_TR3_CONFORMANCE, type X12Tr3Direction } from "@cosyte/x12";
 * const wanted: X12Tr3Direction = "build";
 * const emitted = X12_TR3_CONFORMANCE.filter((row) => row.directions.includes(wanted));
 * emitted.length; // rows this package can produce documents for
 * ```
 */
export type X12Tr3Direction = "read" | "build";

/**
 * How the identifier a row names stands against 45 CFR 162.920.
 *
 * - `incorporated-by-reference`: that section names this exact identifier for
 *   this transaction.
 * - `errata-in-practice`: an errata revision the industry implements, which
 *   that section does not name for this transaction. The base identifier it
 *   DOES name is carried alongside, on `cfrAdopted`.
 * - `not-adopted`: the section names no identifier at all for this
 *   transaction, so there is nothing to be adopted or superseded.
 *
 * @example
 * ```ts
 * import { X12_TR3_CONFORMANCE, type X12Tr3Adoption } from "@cosyte/x12";
 * const strict: X12Tr3Adoption = "incorporated-by-reference";
 * X12_TR3_CONFORMANCE.filter((row) => row.adoption === strict).map((row) => row.transaction);
 * // ["277", "278", "278", "820"]
 * ```
 */
export type X12Tr3Adoption = "incorporated-by-reference" | "errata-in-practice" | "not-adopted";

/**
 * One conformance row: the identifier this package implements for one
 * transaction (and, where a transaction has more than one document or more
 * than one shape, one variant of it), the directions it is implemented in, and
 * the identifiers 45 CFR 162.920 names for it.
 *
 * `transaction` is the transaction set number as it appears in this package's
 * own export names, so `get835` and `build837D` and `parse999` and `buildTA1`
 * are reachable from a row without a second hand-maintained list.
 *
 * `directions` states what is implemented and NEVER implies the other
 * direction: a transaction this package only reads carries `["read"]` alone.
 *
 * `tr3` is `null` only where no implementation guide identifier names the
 * document at all, and `note` then says why.
 *
 * @example
 * ```ts
 * import { X12_TR3_CONFORMANCE, type X12Tr3Conformance } from "@cosyte/x12";
 * const row: X12Tr3Conformance | undefined = X12_TR3_CONFORMANCE.find(
 *   (r) => r.transaction === "837" && r.variant === "I",
 * );
 * row?.tr3;         // "005010X223A3"
 * row?.adoption;    // "errata-in-practice"
 * row?.cfrAdopted;  // ["005010X223", "005010X223A1"]
 * ```
 */
export interface X12Tr3Conformance {
  /** Transaction set number, spelled as this package's export names spell it. */
  readonly transaction: string;
  /** The variant within that transaction, or `null` where there is only one. */
  readonly variant: string | null;
  /** Human-readable document title. Never empty. */
  readonly title: string;
  /** The identifier this package implements, errata suffix included. */
  readonly tr3: string | null;
  /** The directions actually implemented. Never empty. */
  readonly directions: readonly X12Tr3Direction[];
  /** How `tr3` stands against 45 CFR 162.920. */
  readonly adoption: X12Tr3Adoption;
  /** Identifiers 45 CFR 162.920 names for this transaction; empty iff `not-adopted`. */
  readonly cfrAdopted: readonly string[];
  /** Why this row is not the simple case, where it is not. Never an empty string. */
  readonly note: string | null;
}

/**
 * Freeze one row and both of its arrays, so a consumer holding a row cannot
 * change what a later reader sees. @internal
 */
function tr3Row(row: X12Tr3Conformance): X12Tr3Conformance {
  return Object.freeze({
    transaction: row.transaction,
    variant: row.variant,
    title: row.title,
    tr3: row.tr3,
    directions: Object.freeze([...row.directions]),
    adoption: row.adoption,
    cfrAdopted: Object.freeze([...row.cfrAdopted]),
    note: row.note,
  });
}

/** Both directions, which is what every transaction here implements today. @internal */
const READ_AND_BUILD: readonly X12Tr3Direction[] = ["read", "build"];

/**
 * The 270 and 271 carry the same disagreement, so they carry the same words.
 * @internal
 */
const ELIGIBILITY_ERRATA_NOTE =
  "45 CFR 162.920 names 005010X279 for the 270 and 271 pair and names no 005010X279A1. " +
  "An operating rule the same section incorporates, CAQH CORE 259, describes its own " +
  "subject as the HIPAA adopted 005010X279A1. A federally adopted rule therefore calls " +
  "005010X279A1 the adopted document while the incorporation list names 005010X279. " +
  "Which reading a regulator would enforce is not settled here.";

/**
 * Which implementation guide this package implements for each transaction it
 * reads or builds, and what 45 CFR 162.920 names for that transaction.
 *
 * Frozen at every level: the list, each row, and each row's arrays. Assign to
 * any of them and the value a later reader sees is unchanged.
 *
 * The `cfrAdopted` values are read from the official Government Publishing
 * Office XML of 45 CFR 162.920, title 45 volume 2, 2024 annual edition,
 * retrieved 2026-08-25. Thirteen 005010 identifiers appear in that section and
 * no others: 005010X212, 005010X212E1, 005010X217, 005010X217E1, 005010X218,
 * 005010X220, 005010X221, 005010X222, 005010X223, 005010X223A1, 005010X224,
 * 005010X224A1 and 005010X279.
 *
 * @example
 * ```ts
 * import { X12_TR3_CONFORMANCE } from "@cosyte/x12";
 * const remit = X12_TR3_CONFORMANCE.find((row) => row.transaction === "835");
 * remit?.tr3;          // "005010X221A1"
 * remit?.cfrAdopted;   // ["005010X221"]
 * remit?.directions;   // ["read", "build"]
 * ```
 */
export const X12_TR3_CONFORMANCE: readonly X12Tr3Conformance[] = Object.freeze([
  tr3Row({
    transaction: "270",
    variant: null,
    title: "Health Care Eligibility Benefit Inquiry",
    tr3: "005010X279A1",
    directions: READ_AND_BUILD,
    adoption: "errata-in-practice",
    cfrAdopted: ["005010X279"],
    note: ELIGIBILITY_ERRATA_NOTE,
  }),
  tr3Row({
    transaction: "271",
    variant: null,
    title: "Health Care Eligibility Benefit Response",
    tr3: "005010X279A1",
    directions: READ_AND_BUILD,
    adoption: "errata-in-practice",
    cfrAdopted: ["005010X279"],
    note: ELIGIBILITY_ERRATA_NOTE,
  }),
  tr3Row({
    transaction: "277",
    variant: null,
    title: "Health Care Claim Status Response",
    tr3: "005010X212",
    directions: READ_AND_BUILD,
    adoption: "incorporated-by-reference",
    cfrAdopted: ["005010X212", "005010X212E1"],
    note:
      "45 CFR 162.920 names 005010X212 for the 276 and 277 pair, together with its errata " +
      "005010X212E1. This package implements the 277 half of that pair alone: it has no typed " +
      "model for the 276 claim status request in either direction, so no 276 row appears here.",
  }),
  tr3Row({
    transaction: "277",
    variant: "277CA",
    title: "Health Care Claim Acknowledgment",
    tr3: "005010X214",
    directions: READ_AND_BUILD,
    adoption: "not-adopted",
    cfrAdopted: [],
    note:
      "45 CFR 162.920 names no identifier for the claim acknowledgment: 005010X214 appears " +
      "nowhere in that section, so it is not an adopted standard and nothing there supersedes " +
      "it. This package reads and writes it as a trading partner document.",
  }),
  tr3Row({
    transaction: "278",
    variant: "request",
    title: "Health Care Services Review: Request for Review",
    tr3: "005010X217",
    directions: READ_AND_BUILD,
    adoption: "incorporated-by-reference",
    cfrAdopted: ["005010X217", "005010X217E1"],
    note: null,
  }),
  tr3Row({
    transaction: "278",
    variant: "response",
    title: "Health Care Services Review: Response",
    tr3: "005010X217",
    directions: READ_AND_BUILD,
    adoption: "incorporated-by-reference",
    cfrAdopted: ["005010X217", "005010X217E1"],
    note:
      "45 CFR 162.920 names one document for the 278 in both directions, 005010X217 with its " +
      "errata 005010X217E1, and names no 005010X216 anywhere. `build278Response` nevertheless " +
      "writes 005010X216 into ST-03 and GS-08, and that emitted value is unchanged: moving it " +
      "would change what a trading partner receives and what an already published document " +
      "declares. Read this row as the conformance target and the emitted 005010X216 as a " +
      "divergence from it.",
  }),
  tr3Row({
    transaction: "820",
    variant: null,
    title: "Payroll Deducted and Other Group Premium Payment for Insurance Products",
    tr3: "005010X218",
    directions: READ_AND_BUILD,
    adoption: "incorporated-by-reference",
    cfrAdopted: ["005010X218"],
    note: null,
  }),
  tr3Row({
    transaction: "834",
    variant: null,
    title: "Benefit Enrollment and Maintenance",
    tr3: "005010X220A1",
    directions: READ_AND_BUILD,
    adoption: "errata-in-practice",
    cfrAdopted: ["005010X220"],
    note:
      "45 CFR 162.920 names 005010X220 for the 834 and adopts no errata for it; 005010X220A1 " +
      "appears nowhere in that section. This package implements the errata revision, which is " +
      "what the industry implements.",
  }),
  tr3Row({
    transaction: "835",
    variant: null,
    title: "Health Care Claim Payment/Advice",
    tr3: "005010X221A1",
    directions: READ_AND_BUILD,
    adoption: "errata-in-practice",
    cfrAdopted: ["005010X221"],
    note:
      "45 CFR 162.920 names 005010X221 for the 835 and adopts no errata for it; 005010X221A1 " +
      "appears nowhere in that section. This package implements the errata revision, which is " +
      "what the industry implements.",
  }),
  tr3Row({
    transaction: "837",
    variant: "P",
    title: "Health Care Claim: Professional",
    tr3: "005010X222A2",
    directions: READ_AND_BUILD,
    adoption: "errata-in-practice",
    cfrAdopted: ["005010X222"],
    note:
      "45 CFR 162.920 names 005010X222 for the professional claim and adopts no errata for it; " +
      "005010X222A2 appears nowhere in that section. 005010X222A2 is what this package emits " +
      "when the caller states no implementation convention reference of its own, and a caller " +
      "that states one is emitted verbatim instead.",
  }),
  tr3Row({
    transaction: "837",
    variant: "I",
    title: "Health Care Claim: Institutional",
    tr3: "005010X223A3",
    directions: READ_AND_BUILD,
    adoption: "errata-in-practice",
    cfrAdopted: ["005010X223", "005010X223A1"],
    note:
      "45 CFR 162.920 names 005010X223 for the institutional claim together with Type 1 errata " +
      "005010X223A1, and names no 005010X223A3. 005010X223A3 is what this package emits when " +
      "the caller states no implementation convention reference of its own, and a caller that " +
      "states one is emitted verbatim instead.",
  }),
  tr3Row({
    transaction: "837",
    variant: "D",
    title: "Health Care Claim: Dental",
    tr3: "005010X224A2",
    directions: READ_AND_BUILD,
    adoption: "errata-in-practice",
    cfrAdopted: ["005010X224", "005010X224A1"],
    note:
      "45 CFR 162.920 names 005010X224 for the dental claim together with Type 1 errata " +
      "005010X224A1, and names no 005010X224A2. 005010X224A2 is what this package emits when " +
      "the caller states no implementation convention reference of its own, and a caller that " +
      "states one is emitted verbatim instead.",
  }),
  tr3Row({
    transaction: "999",
    variant: null,
    title: "Implementation Acknowledgment",
    tr3: "005010X231A1",
    directions: READ_AND_BUILD,
    adoption: "not-adopted",
    cfrAdopted: [],
    note:
      "45 CFR 162.920 names no identifier for the implementation acknowledgment: 005010X231A1 " +
      "appears nowhere in that section, so it is not an adopted standard. This package reads " +
      "and writes it as a pure value and decides no acknowledgment policy with it.",
  }),
  tr3Row({
    transaction: "TA1",
    variant: null,
    title: "Interchange Acknowledgment",
    tr3: null,
    directions: READ_AND_BUILD,
    adoption: "not-adopted",
    cfrAdopted: [],
    note:
      "The TA1 is an interchange level acknowledgment segment carried in the envelope rather " +
      "than a transaction set, so no implementation guide identifier names it and none is " +
      "carried here. 45 CFR 162.920 names no identifier for it either.",
  }),
]);
