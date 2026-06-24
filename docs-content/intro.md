---
id: intro
title: Getting started
sidebar_position: 1
---

# @cosyte/x12

A developer-focused ASC X12 EDI parser for Node.js and TypeScript. Parse a real-world, vendor-quirky
healthcare interchange and read fields out of it without first reading the X12 standard or a TR3
implementation guide. `@cosyte/x12` is the payer-side sibling of [`@cosyte/hl7`](../hl7/intro): the
API shape, profile system, and lenient-parser philosophy are deliberately mirrored.

It covers the HIPAA **005010** healthcare transaction sets:

- **270 / 271** — eligibility inquiry and response
- **276 / 277** — claim status inquiry and response
- **278** — services review (request and response)
- **834** — benefit enrollment and maintenance
- **835** — healthcare claim payment / advice (remittance)
- **837P / 837I / 837D** — professional, institutional, and dental claims
- **999 / TA1** — implementation and interchange acknowledgments

## Install

```bash
npm install @cosyte/x12
```

## Parse an interchange

```ts
import { parseX12 } from "@cosyte/x12";

const interchange = parseX12(raw);

interchange.get("ISA.06"); // sender ID
interchange.transactions(); // typed ST/SE transaction sets
interchange.warnings; // stable, positional tolerance warnings
```

The parser is **lenient by default** — vendor deviations become warnings carrying a stable code and
positional context, not failures — while serialization always emits spec-clean X12 with envelope
counts recomputed where requested (Postel's Law). Pass `{ strict: true }` to escalate every tolerated
deviation to a thrown error.

## Acknowledgments

`build999`, `buildTA1`, and `parse999` are pure functions: they never auto-send, open sockets, or
touch the filesystem — you decide when and how a generated acknowledgment leaves the box.

```ts
import { build999 } from "@cosyte/x12";

const ack = build999(interchange); // a 999 you control the delivery of
```

## Next

- Read the **API reference** for every export, generated from source.
- See `@cosyte/hl7` for the matching HL7 v2 toolkit — the two share an API shape on purpose.
