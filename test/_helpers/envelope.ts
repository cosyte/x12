/**
 * Test-only helper for assembling spec-conformant ISA envelopes by name +
 * shape. Builds the 106-byte ISA segment (including terminator) deterministically
 * from a small option bag so tests can stress one variable at a time
 * without hand-counting fixed positions.
 *
 * Lives under `test/_helpers/` so it is NOT shipped - pure test utility.
 * @internal
 */

/**
 * The 16 ISA element widths per ASC X12 .5 (fixed-position). Padded to
 * width with trailing spaces by {@link pad}.
 */
const ISA_WIDTHS = [2, 10, 2, 10, 2, 15, 2, 15, 6, 4, 1, 5, 9, 1, 1, 1] as const;

function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/** Options accepted by {@link buildIsa}. */
export interface BuildIsaOptions {
  readonly element?: string;
  readonly repetition?: string;
  readonly component?: string;
  readonly segment?: string;
  readonly senderQual?: string;
  readonly senderId?: string;
  readonly receiverQual?: string;
  readonly receiverId?: string;
  readonly date?: string;
  readonly time?: string;
  readonly version?: string;
  readonly controlNumber?: string;
  readonly usageIndicator?: string;
}

/**
 * Assemble a 106-byte (including terminator) ISA segment from the named
 * delimiters + field overrides. The returned string is exactly what would
 * appear on the wire - split on `delimiters.element` it has 17 entries
 * (`"ISA"` + 16 elements). The last char is the segment terminator.
 */
export function buildIsa(opts: BuildIsaOptions = {}): string {
  const element = opts.element ?? "*";
  const repetition = opts.repetition ?? "^";
  const component = opts.component ?? ":";
  const segment = opts.segment ?? "~";
  const senderQual = opts.senderQual ?? "ZZ";
  const senderId = opts.senderId ?? "SENDER";
  const receiverQual = opts.receiverQual ?? "ZZ";
  const receiverId = opts.receiverId ?? "RECEIVER";
  const date = opts.date ?? "250101";
  const time = opts.time ?? "1200";
  const version = opts.version ?? "00501";
  const controlNumber = opts.controlNumber ?? "000000001";
  const usageIndicator = opts.usageIndicator ?? "P";

  const elements = [
    "00",
    "",
    "00",
    "",
    senderQual,
    senderId,
    receiverQual,
    receiverId,
    date,
    time,
    repetition,
    version,
    controlNumber,
    "0",
    usageIndicator,
    component,
  ];
  const padded = elements.map((v, i) => {
    const width = ISA_WIDTHS[i];
    if (width === undefined) throw new Error(`Internal: ISA width missing for index ${String(i)}`);
    return pad(v, width);
  });
  return "ISA" + element + padded.join(element) + segment;
}

/**
 * Assemble a complete minimal interchange - ISA, one GS..GE group, one
 * ST..SE transaction (claims body kept empty / opaque), IEA - using the
 * delimiters from {@link buildIsa}.
 */
export interface BuildInterchangeOptions extends BuildIsaOptions {
  readonly trailingCrlf?: boolean;
  readonly groupControlNumber?: string;
  readonly transactionControlNumber?: string;
  readonly transactionSetId?: string;
  readonly functionalIdCode?: string;
  readonly versionRelease?: string;
  readonly transactionBody?: readonly string[];
}

export function buildInterchange(opts: BuildInterchangeOptions = {}): string {
  const element = opts.element ?? "*";
  const segment = opts.segment ?? "~";
  const crlf = opts.trailingCrlf === true ? "\r\n" : "";
  const isa = buildIsa(opts);
  const groupCN = opts.groupControlNumber ?? "1";
  const txCN = opts.transactionControlNumber ?? "0001";
  const txSetId = opts.transactionSetId ?? "837";
  const funcCode = opts.functionalIdCode ?? "HC";
  const versionRelease = opts.versionRelease ?? "005010X222A2";
  const ctrlNumber = opts.controlNumber ?? "000000001";
  const body = opts.transactionBody ?? [];

  // Compose GS/ST/SE/GE/IEA. SE-01 is the transaction segment count
  // including ST and SE. ST + body + SE = body.length + 2.
  const gs = ["GS", funcCode, "S", "R", "20250101", "1200", groupCN, "X", versionRelease].join(
    element,
  );
  const st = ["ST", txSetId, txCN].join(element);
  const se = ["SE", String(body.length + 2), txCN].join(element);
  const ge = ["GE", "1", groupCN].join(element);
  const iea = ["IEA", "1", ctrlNumber].join(element);

  const tail = [gs, st, ...body, se, ge, iea].map((s) => s + segment + crlf).join("");
  return isa + crlf + tail;
}
