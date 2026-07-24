/**
 * HI (Health Care Code Information) segment qualifier → code-system
 * provenance table. The 837 family uses HI to carry diagnoses, principal
 * procedures, external cause of injury, condition codes, occurrence codes,
 * value codes, and DRG / patient-related groupings - all under one segment
 * id, with the first component of each composite (HI-NN-1) acting as a
 * code-list qualifier that governs how HI-NN-2 should be interpreted.
 *
 * **Why this lives in its own module.** Misreading a qualifier picks the
 * wrong code system. A `J45.50` interpreted as ICD-9-CM (where it does not
 * exist) instead of ICD-10-CM (asthma, moderate persistent, uncomplicated)
 * silently corrupts the clinical context downstream. The parser surfaces
 * the verbatim qualifier AND the resolved {@link X12HiCodeSystem} so
 * consumers never have to re-derive the mapping themselves and an unknown
 * qualifier still passes through with an `X12_UNKNOWN_HI_QUALIFIER`
 * warning rather than a silent miscategorization.
 *
 * Source: CMS NUBC / WPC TR3 references for 005010X222A2 (837P),
 * 005010X223A3 (837I), and 005010X224A2 (837D); the qualifier list is
 * cross-referenced with X12 External Code List 1270 (Code List Qualifier
 * Code) - the values that appear specifically on HI in HIPAA healthcare
 * claims. Listed verbatim from the TR3 cross-references - no inference;
 * unknown qualifiers map to `"unknown"` and the verbatim code is still
 * preserved on the parsed diagnosis / procedure.
 *
 * Snapshot date 2026-06-27. This is a curated read-only table - Phase 9
 * (vendor profiles) may LAYER additional qualifiers per payer, but the
 * BASE mapping ships as a frozen artifact so a single CMS change isn't a
 * silent semantic drift.
 */

/**
 * Discriminant for the code system referenced by a single HI composite. The
 * `"unknown"` member is the catch-all for qualifiers outside the TR3-cited
 * set - verbatim code is preserved on the parsed structure and an
 * `X12_UNKNOWN_HI_QUALIFIER` warning is emitted.
 *
 * @example
 * ```ts
 * import type { X12HiCodeSystem } from "@cosyte/x12";
 * const sys: X12HiCodeSystem = "ICD-10-CM";
 * ```
 */
export type X12HiCodeSystem =
  | "ICD-10-CM"
  | "ICD-10-PCS"
  | "ICD-9-CM"
  | "ICD-9-PCS"
  | "DRG"
  | "NDC"
  | "NUBC-CONDITION"
  | "NUBC-OCCURRENCE"
  | "NUBC-OCCURRENCE-SPAN"
  | "NUBC-VALUE"
  | "NUBC-PATIENT-REASON"
  | "unknown";

/**
 * Category of an HI qualifier - separates diagnoses from procedures from
 * the institutional NUBC code families. Consumers branching on the
 * category get exhaustiveness; the variant-specific helpers
 * (`getDiagnoses` / `getProcedures`) filter on it.
 *
 * @example
 * ```ts
 * import type { X12HiCategory } from "@cosyte/x12";
 * const c: X12HiCategory = "diagnosis";
 * ```
 */
export type X12HiCategory =
  | "diagnosis"
  | "procedure"
  | "external-cause"
  | "principal-diagnosis"
  | "admitting-diagnosis"
  | "patient-reason-for-visit"
  | "drg"
  | "condition"
  | "occurrence"
  | "occurrence-span"
  | "value"
  | "treatment"
  | "unknown";

/**
 * One row of the HI-qualifier table. `system` answers "what code list is
 * HI-NN-2 from?"; `category` answers "what role does this qualifier play
 * in the claim?". Frozen by construction - the registry below is `as
 * const`, so this interface is the read shape and is not exported as a
 * widened type.
 *
 * @internal
 */
interface HiQualifierEntry {
  readonly system: X12HiCodeSystem;
  readonly category: X12HiCategory;
  readonly description: string;
}

/**
 * The HI qualifier → ({@link X12HiCodeSystem} + {@link X12HiCategory})
 * registry. Frozen with `as const` so the keyset is type-narrowed for
 * downstream consumers. Each entry cites its TR3 use site in the
 * description so a reviewer can confirm against the source.
 *
 * Snapshot covers the qualifiers cited across 837P/I/D TR3s plus the most
 * common NUBC code-set qualifiers. Additions are non-breaking; renames or
 * removals are breaking and require a public-surface bump.
 *
 * @example
 * ```ts
 * import { HI_QUALIFIERS, resolveHiQualifier } from "@cosyte/x12";
 * HI_QUALIFIERS.ABK.system;   // "ICD-10-CM"
 * resolveHiQualifier("ABK");  // { system: "ICD-10-CM", category: "principal-diagnosis", ... }
 * resolveHiQualifier("ZZZ");  // undefined
 * ```
 */
export const HI_QUALIFIERS = {
  // ---------------- ICD-10-CM diagnoses (current) ----------------
  ABK: {
    system: "ICD-10-CM",
    category: "principal-diagnosis",
    description: "Principal diagnosis, ICD-10-CM (837I; 837P uses ABK in HI-01 for the principal).",
  },
  ABF: {
    system: "ICD-10-CM",
    category: "diagnosis",
    description: "Other (secondary) diagnosis, ICD-10-CM.",
  },
  ABJ: {
    system: "ICD-10-CM",
    category: "admitting-diagnosis",
    description: "Admitting diagnosis, ICD-10-CM (837I inpatient).",
  },
  ABN: {
    system: "ICD-10-CM",
    category: "patient-reason-for-visit",
    description: "Patient's reason for visit, ICD-10-CM (837I outpatient).",
  },
  APR: {
    system: "ICD-10-CM",
    category: "external-cause",
    description: "External cause of injury, ICD-10-CM (V-Y codes).",
  },

  // ---------------- ICD-9-CM diagnoses (legacy / pre-2015) ----------------
  BK: {
    system: "ICD-9-CM",
    category: "principal-diagnosis",
    description: "Principal diagnosis, ICD-9-CM (legacy; replaced by ABK 2015-10-01 onward).",
  },
  BF: {
    system: "ICD-9-CM",
    category: "diagnosis",
    description: "Other diagnosis, ICD-9-CM (legacy; replaced by ABF).",
  },
  BJ: {
    system: "ICD-9-CM",
    category: "admitting-diagnosis",
    description: "Admitting diagnosis, ICD-9-CM (legacy; replaced by ABJ).",
  },
  BN: {
    system: "ICD-9-CM",
    category: "patient-reason-for-visit",
    description: "Reason for visit, ICD-9-CM (legacy; replaced by ABN).",
  },
  BR: {
    system: "ICD-9-CM",
    category: "external-cause",
    description: "External cause of injury, ICD-9-CM (legacy; replaced by APR).",
  },

  // ---------------- ICD-10-PCS procedures (current) ----------------
  BBR: {
    system: "ICD-10-PCS",
    category: "procedure",
    description: "Other (secondary) procedure, ICD-10-PCS (837I).",
  },
  BBQ: {
    system: "ICD-10-PCS",
    category: "treatment",
    description: "Principal procedure, ICD-10-PCS (837I).",
  },

  // ---------------- ICD-9-PCS procedures (legacy / pre-2015) ----------------
  BQ: {
    system: "ICD-9-PCS",
    category: "treatment",
    description: "Principal procedure, ICD-9-PCS (legacy; replaced by BBQ).",
  },
  BBA: {
    system: "ICD-9-PCS",
    category: "procedure",
    description: "Other procedure, ICD-9-PCS (legacy; replaced by BBR).",
  },

  // ---------------- DRG / patient-related groupings ----------------
  DR: {
    system: "DRG",
    category: "drg",
    description: "Diagnosis Related Group (DRG) - payment-grouping code.",
  },

  // ---------------- NUBC institutional code sets (837I) ----------------
  BG: {
    system: "NUBC-CONDITION",
    category: "condition",
    description: "Condition code (NUBC FL 18-28).",
  },
  BH: {
    system: "NUBC-OCCURRENCE",
    category: "occurrence",
    description: "Occurrence code (NUBC FL 31-34) - date paired in HI-NN-4.",
  },
  BI: {
    system: "NUBC-OCCURRENCE-SPAN",
    category: "occurrence-span",
    description: "Occurrence span code (NUBC FL 35-36) - date range in HI-NN-5/6.",
  },
  BE: {
    system: "NUBC-VALUE",
    category: "value",
    description: "Value code (NUBC FL 39-41) - paired amount in HI-NN-5 as decimal.",
  },
  PR: {
    system: "NUBC-PATIENT-REASON",
    category: "patient-reason-for-visit",
    description: "Patient reason for visit (837I outpatient secondary code; ICD-10-CM coded).",
  },
} as const satisfies Record<string, HiQualifierEntry>;

/**
 * Stable string-literal union of every known HI qualifier the parser
 * recognizes. Inferred from {@link HI_QUALIFIERS} keys.
 *
 * @example
 * ```ts
 * import type { X12HiQualifier } from "@cosyte/x12";
 * const q: X12HiQualifier = "ABK";
 * ```
 */
export type X12HiQualifier = keyof typeof HI_QUALIFIERS;

/**
 * Resolve an HI qualifier string into a {@link HiQualifierEntry}, or
 * `undefined` if the qualifier is outside the bundled snapshot. Unknown
 * qualifiers still parse - the parser preserves the verbatim qualifier on
 * the diagnosis/procedure and emits `X12_UNKNOWN_HI_QUALIFIER`. The lookup
 * is case-sensitive (TR3 qualifiers are uppercase).
 *
 * @example
 * ```ts
 * import { resolveHiQualifier } from "@cosyte/x12";
 * resolveHiQualifier("ABK")?.system;     // "ICD-10-CM"
 * resolveHiQualifier("ABK")?.category;   // "principal-diagnosis"
 * resolveHiQualifier("XYZ");             // undefined
 * ```
 */
export function resolveHiQualifier(qualifier: string): HiQualifierEntry | undefined {
  return (HI_QUALIFIERS as Record<string, HiQualifierEntry>)[qualifier];
}

/**
 * Decide whether an HI qualifier represents a diagnosis (principal,
 * secondary, admitting, reason-for-visit, external-cause). Used by
 * variant-specific extractors that split the HI segment family into
 * diagnoses vs procedures.
 *
 * @example
 * ```ts
 * import { isDiagnosisQualifier } from "@cosyte/x12";
 * isDiagnosisQualifier("ABK"); // true (principal diagnosis)
 * isDiagnosisQualifier("BBR"); // false (procedure)
 * isDiagnosisQualifier("XYZ"); // false
 * ```
 */
export function isDiagnosisQualifier(qualifier: string): boolean {
  const entry = resolveHiQualifier(qualifier);
  if (entry === undefined) return false;
  switch (entry.category) {
    case "diagnosis":
    case "principal-diagnosis":
    case "admitting-diagnosis":
    case "patient-reason-for-visit":
    case "external-cause":
      return true;
    case "procedure":
    case "treatment":
    case "drg":
    case "condition":
    case "occurrence":
    case "occurrence-span":
    case "value":
    case "unknown":
      return false;
  }
}

/**
 * Decide whether an HI qualifier represents a procedure (principal or
 * other) - current ICD-10-PCS or legacy ICD-9-PCS.
 *
 * @example
 * ```ts
 * import { isProcedureQualifier } from "@cosyte/x12";
 * isProcedureQualifier("BBR"); // true (other procedure, ICD-10-PCS)
 * isProcedureQualifier("ABK"); // false (diagnosis)
 * ```
 */
export function isProcedureQualifier(qualifier: string): boolean {
  const entry = resolveHiQualifier(qualifier);
  if (entry === undefined) return false;
  return entry.category === "procedure" || entry.category === "treatment";
}
