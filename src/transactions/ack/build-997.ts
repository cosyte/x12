/**
 * `build997` - pure-function builder for a 997 Functional Acknowledgment.
 * NEVER auto-sends, NEVER opens a socket, NEVER touches the filesystem.
 *
 * The 997 is written to the ASC X12 base standard alone: GS-08 is the base
 * version `005010`, the ST carries no ST-03, and AK1, AK2, AK3, AK4, AK5 and
 * AK9 are written by the same code that writes the 999 (`./build-999.ts`),
 * with every guard it applies: an accept paired with errors is refused, the
 * AK9 counts must agree, and every control number is required.
 *
 * What a 997 adds, refused here before anything is written: AK5-01 and
 * AK9-01 must be codes of their lists (717 and 715), every count and position
 * a whole number, and AK4-03 a non-empty string. The codes a caller supplies
 * for AK3-04, AK4-03 and the syntax error lists are written verbatim, escaped;
 * no guide table checks them.
 */

import type { X12Interchange } from "../../parser/types.js";
import { requireCallerArray, requireCallerEntries } from "../../builder/caller-array.js";
import { requireCallerSegment } from "../../builder/caller-segment.js";

import {
  buildAcknowledgment,
  type AckElementErrorSpec,
  type AckSegmentErrorSpec,
  type AckSpec,
  type AckTransactionResponseSpec,
} from "./build-999.js";
import { X12_997_SET_DISPOSITION_CODES, X12_ACK_DISPOSITION_CODES } from "./codes.js";
import { ACK_BUILD_ERROR_CODES, AckBuildError } from "./errors.js";
import type { Build997Spec } from "./types.js";

/** Refuse with this module's typed error. @internal */
function refuseSpec(message: string): never {
  throw new AckBuildError(ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC, message);
}

/**
 * `build997` - assemble a 997 Functional Acknowledgment around the supplied
 * envelope and functional group spec.
 *
 * Refused through {@link AckBuildError}:
 * - an AK9-01 outside code list 715, or an AK5-01 outside code list 717
 *   (which has no `P`) - `X12_ACK_INVALID_DISPOSITION`;
 * - a count, AK3-02 position or AK4-01 position that is not a whole number,
 *   an empty AK4-03, or `contexts` on any segment or element error (a 999
 *   error list passed on: the 997 has no CTX) - `X12_ACK_INVALID_SPEC`;
 * - everything `build999` refuses: an accept with errors
 *   (`X12_ACK_ACCEPT_WITH_ERRORS`), counts that disagree
 *   (`X12_ACK_COUNT_MISMATCH`), an empty or over-long control number.
 *
 * @example
 * ```ts
 * import { build997, serializeX12 } from "@cosyte/x12";
 * const ix = build997({
 *   envelope: {
 *     senderId: "RECEIVER", receiverId: "SENDER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   functionalGroup: {
 *     functionalIdCode: "HC", groupControlNumber: "7",
 *     disposition: "A",
 *     numberOfTransactionSets: 1, numberOfReceivedTransactionSets: 1, numberOfAcceptedTransactionSets: 1,
 *     transactionResponses: [
 *       { transactionSetIdCode: "837", transactionSetControlNumber: "0001", disposition: "A" },
 *     ],
 *   },
 * });
 * serializeX12(ix); // "ISA*00*...~GS*FA*RECEIVER*SENDER*20260601*1200*1*X*005010~ST*997*0001~AK1*HC*7~..."
 * ```
 */
export function build997(spec: Build997Spec): X12Interchange {
  // Every field is read once, here, into fresh plain objects, and the writer
  // is handed that snapshot rather than the caller's spec: a getter or a
  // prototype cannot show one answer to these checks and another to the
  // writer.
  return buildAcknowledgment(snapshot(spec), "997", joinSeg);
}

/** Every field of the envelope spec, read once each. @internal */
const ENVELOPE_FIELDS = [
  "senderId",
  "senderQualifier",
  "receiverId",
  "receiverQualifier",
  "interchangeDate",
  "interchangeTime",
  "interchangeControlNumber",
  "usageIndicator",
  "groupControlNumber",
  "groupDate",
  "groupTime",
  "groupResponsibleAgency",
  "transactionSetControlNumber",
  "repetitionSeparator",
  "componentSeparator",
  "segmentTerminator",
  "elementSeparator",
] as const;

/**
 * Read the caller's spec once into a plain object the shared writer takes,
 * refusing on the way what a 997 cannot carry. Fields the writer does not
 * read are not copied. @internal
 */
function snapshot(spec: Build997Spec): AckSpec {
  const source = spec.envelope as unknown as Readonly<Record<string, unknown>>;
  const envelope: Record<string, unknown> = {};
  for (const field of ENVELOPE_FIELDS) {
    const value = source[field];
    if (value !== undefined) envelope[field] = value;
  }

  const group = spec.functionalGroup;
  const disposition = group.disposition;
  if (!isCode(X12_ACK_DISPOSITION_CODES, disposition)) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_DISPOSITION,
      "build997: functionalGroup.disposition (AK9-01) must be one of A, E, P, R, M, W or X, the codes of code list 715.",
    );
  }
  const numberOfTransactionSets = requireWholeNumber(
    group.numberOfTransactionSets,
    "functionalGroup.numberOfTransactionSets",
  );
  const numberOfReceivedTransactionSets = requireWholeNumber(
    group.numberOfReceivedTransactionSets,
    "functionalGroup.numberOfReceivedTransactionSets",
  );
  const numberOfAcceptedTransactionSets = requireWholeNumber(
    group.numberOfAcceptedTransactionSets,
    "functionalGroup.numberOfAcceptedTransactionSets",
  );
  const functionalIdCode = group.functionalIdCode;
  const groupControlNumber = group.groupControlNumber;
  const versionRelease = group.versionRelease;
  const groupCodes = copyList(group.syntaxErrorCodes, "functionalGroup.syntaxErrorCodes");

  const transactionResponses: AckTransactionResponseSpec[] = [];
  let r = 0;
  for (const response of requireCallerEntries(
    group.transactionResponses,
    "build997: functionalGroup.transactionResponses",
    refuseSpec,
  )) {
    const setDisposition = response.disposition;
    if (!isCode(X12_997_SET_DISPOSITION_CODES, setDisposition)) {
      throw new AckBuildError(
        ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_DISPOSITION,
        `build997: transactionResponses[${String(r)}].disposition (AK5-01) must be one of A, E, M, R, W or X, the codes of code list 717, which has no P.`,
      );
    }
    const segmentErrors: AckSegmentErrorSpec[] = [];
    let s = 0;
    for (const segError of requireCallerEntries(
      response.segmentErrors,
      "build997: response.segmentErrors",
      refuseSpec,
    )) {
      // A 999 error list has this shape plus `contexts`, so it type-checks
      // here. The writer never emits a CTX for a 997, and a caller who
      // supplied contexts is told so rather than having them dropped: `in`
      // sees an inherited or getter-backed `contexts` as the writer would.
      if ("contexts" in requireObject(segError, "segmentErrors[]")) {
        throw new AckBuildError(
          ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
          `build997: transactionResponses[${String(r)}].segmentErrors[${String(s)}].contexts is set. The 997 has no CTX segment, so this builder writes none; remove contexts.`,
        );
      }
      const segmentPositionInTransactionSet = requireWholeNumber(
        segError.segmentPositionInTransactionSet,
        "segmentErrors[].segmentPositionInTransactionSet",
      );
      const segmentIdCode = segError.segmentIdCode;
      const loopIdentifier = segError.loopIdentifier;
      const segmentCode = segError.syntaxErrorCode;
      const elementErrors: AckElementErrorSpec[] = [];
      let e = 0;
      for (const elemError of requireCallerEntries(
        segError.elementErrors,
        "build997: segError.elementErrors",
        refuseSpec,
      )) {
        if ("contexts" in requireObject(elemError, "elementErrors[]")) {
          throw new AckBuildError(
            ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
            `build997: transactionResponses[${String(r)}].segmentErrors[${String(s)}].elementErrors[${String(e)}].contexts is set. The 997 has no CTX segment, so this builder writes none; remove contexts.`,
          );
        }
        const position = requireObject(elemError.position, "elementErrors[].position");
        const element = requireWholeNumber(position.element, "elementErrors[].position.element");
        const rawComponent = position.component;
        const component =
          rawComponent === undefined
            ? undefined
            : requireWholeNumber(rawComponent, "elementErrors[].position.component");
        const rawRepetition = position.repetition;
        const repetition =
          rawRepetition === undefined
            ? undefined
            : requireWholeNumber(rawRepetition, "elementErrors[].position.repetition");
        const syntaxErrorCode = elemError.syntaxErrorCode;
        if (syntaxErrorCode === "") {
          throw new AckBuildError(
            ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
            `build997: transactionResponses[${String(r)}].segmentErrors[${String(s)}].elementErrors[${String(e)}].syntaxErrorCode (AK4-03) is empty. It is required, and this builder never invents one.`,
          );
        }
        elementErrors.push({
          position: { element, component, repetition },
          dataElementReferenceNumber: elemError.dataElementReferenceNumber,
          syntaxErrorCode,
          copyOfBadDataElement: elemError.copyOfBadDataElement,
        });
        e += 1;
      }
      segmentErrors.push({
        segmentIdCode,
        segmentPositionInTransactionSet,
        loopIdentifier,
        syntaxErrorCode: segmentCode,
        elementErrors,
      });
      s += 1;
    }
    transactionResponses.push({
      transactionSetIdCode: response.transactionSetIdCode,
      transactionSetControlNumber: response.transactionSetControlNumber,
      implementationConventionReference: response.implementationConventionReference,
      disposition: setDisposition,
      syntaxErrorCodes: copyList(
        response.syntaxErrorCodes,
        "transactionResponses[].syntaxErrorCodes",
      ),
      segmentErrors,
    });
    r += 1;
  }

  return {
    envelope: envelope as unknown as AckSpec["envelope"],
    functionalGroup: {
      functionalIdCode,
      groupControlNumber,
      versionRelease,
      disposition,
      numberOfTransactionSets,
      numberOfReceivedTransactionSets,
      numberOfAcceptedTransactionSets,
      syntaxErrorCodes: groupCodes,
      transactionResponses,
    },
  };
}

/** A caller list copied once into a fresh array, or `undefined` when absent. @internal */
function copyList(
  value: readonly string[] | null | undefined,
  at: string,
): readonly string[] | undefined {
  if (value === undefined) return undefined;
  return Array.from(requireCallerArray(value, `build997: ${at}`, refuseSpec));
}

/** Refuse an entry that is not an object, so a property read on it means what it says. @internal */
function requireObject<T>(value: T, field: string): T & object {
  if (typeof value === "object" && value !== null) return value;
  refuseSpec(`build997: ${field} must be an object.`);
}

/**
 * This builder's segment joiner, handed to the shared acknowledgment code so
 * a non-string element is refused under this builder's own name.
 *
 * @internal
 */
function joinSeg(
  parts: readonly string[],
  elementSeparator: string,
  segmentTerminator: string,
): string {
  requireCallerSegment(parts, "build997", refuseSpec);
  return parts.join(elementSeparator) + segmentTerminator;
}

/** Whether `code` is a key of `table`, compared exactly. @internal */
function isCode<T extends string>(
  table: Readonly<Record<string, string>>,
  code: unknown,
): code is T {
  return typeof code === "string" && Object.hasOwn(table, code);
}

/**
 * Refuse a count or position that is not a whole number, so `String(value)`
 * writes exactly what the caller meant: never `1.5`, `NaN` or `1e+21`.
 *
 * @internal
 */
function requireWholeNumber(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  refuseSpec(
    `build997: ${field} must be a whole number of zero or more, written as it stands; nothing is rounded or coerced.`,
  );
}
