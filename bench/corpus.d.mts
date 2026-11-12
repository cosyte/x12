// Types for corpus.mjs, so the TypeScript tests under test/perf can import it. Each spec function
// takes the decimal reader of the module under test and returns the spec its builder takes.

import type {
  Build270Spec,
  Build271Spec,
  Build275Spec,
  Build276Spec,
  Build277RfaiSpec,
  Build277Spec,
  Build278Spec,
  Build820Spec,
  Build834Spec,
  Build835Spec,
  Build837Spec,
  Build997Spec,
  Build999Spec,
  BuildTA1Spec,
  X12Decimal,
} from "../src/index.js";

/** Reads an amount the corpus holds as a string into the module's `X12Decimal`. */
export type DecimalReader = (value: string) => X12Decimal;

export function remit835Text(i: number, claims: number): string;
export function remit835Spec(dec: DecimalReader, i: number, claims: number): Build835Spec;
export function claim837PText(i: number, claims: number): string;
export function claim837PSpec(dec: DecimalReader, i: number, claims: number): Build837Spec;
export function claim837IText(i: number, claims: number): string;
export function claim837ISpec(dec: DecimalReader, i: number, claims: number): Build837Spec;
export function inquiry270Text(i: number): string;
export function inquiry270Spec(dec: DecimalReader, i: number): Build270Spec;
export function eligibility271Text(i: number, benefits: number): string;
export function eligibility271Spec(dec: DecimalReader, i: number, benefits: number): Build271Spec;
export function ack997Text(i: number, sets?: number): string;
export function ack997Spec(dec: DecimalReader, i: number, sets?: number): Build997Spec;
export function ack999Text(i: number, sets?: number): string;
export function ack999Spec(dec: DecimalReader, i: number, sets?: number): Build999Spec;
export function attachment275Text(i: number, bytes: number): string;
export function attachment275Spec(dec: DecimalReader, i: number, bytes: number): Build275Spec;
export function inquiry276Text(i: number, claims: number): string;
export function inquiry276Spec(dec: DecimalReader, i: number, claims: number): Build276Spec;
export function status277Text(i: number, claims: number): string;
export function status277Spec(dec: DecimalReader, i: number, claims: number): Build277Spec;
export function ack277CAText(i: number, claims: number): string;
export function ack277CASpec(dec: DecimalReader, i: number, claims: number): Build277Spec;
export function request277Text(i: number, claims: number): string;
export function request277Spec(dec: DecimalReader, i: number, claims: number): Build277RfaiSpec;
export function review278RequestText(i: number, services: number): string;
export function review278RequestSpec(dec: DecimalReader, i: number, services: number): Build278Spec;
export function review278ResponseText(i: number, services: number): string;
export function review278ResponseSpec(
  dec: DecimalReader,
  i: number,
  services: number,
): Build278Spec;
export function premium820Text(i: number, members: number): string;
export function premium820Spec(dec: DecimalReader, i: number, members: number): Build820Spec;
export function enrollment834Text(i: number, members: number): string;
export function enrollment834Spec(dec: DecimalReader, i: number, members: number): Build834Spec;
export function claim837DText(i: number, claims: number): string;
export function claim837DSpec(dec: DecimalReader, i: number, claims: number): Build837Spec;
export function ta1Text(i: number): string;
export function ta1Spec(dec: DecimalReader, i: number): BuildTA1Spec;
