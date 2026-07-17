---
id: installation
title: Installation
sidebar_position: 1
---

# Installation

`@cosyte/x12` is a TypeScript ASC X12 toolkit for Node.js. It ships dual **ESM + CJS** builds with
per-condition type declarations, so it works from either module system without configuration, and it
has **zero runtime dependencies** — Node stdlib only.

> **Status:** pre-alpha (`0.0.x`), not yet published to npm. The command below is the shape it will
> take at first publish; until then, consume it from source or a workspace link.

## Prerequisites

- **Node.js >= 22.** The whole `@cosyte/*` suite targets ES2023 / Node 22+.
- A package manager — `pnpm`, `npm`, or `yarn`.
- **No runtime dependencies.** The parser, serializer, builders, and bundled HIPAA code-list
  snapshots are all Node stdlib only. The zero-dep rule is a release gate, not a preference — a new
  runtime dep needs an ADR and a changelog entry.

## Install

```bash
npm install @cosyte/x12
```

## Smoke test

Confirm the package resolves and a real entry point is callable — decode the smallest valid
interchange envelope and read its detected delimiters back:

```ts runnable
import { parseX12 } from "@cosyte/x12";

const raw =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "IEA*0*000000001~";

const ix = parseX12(raw);

ix.delimiters.element; // => "*"
ix.delimiters.segment; // => "~"
ix.isa.elements[16]; // => ":"
Array.isArray(ix.warnings); // => true
```

If that resolves and returns, the install is good — head to the [Quickstart](./quickstart).

## Module systems

`@cosyte/x12` is `"type": "module"` and exposes both conditions, so both of these resolve to the right
build without extra configuration:

```ts
// ESM / TypeScript
import { parseX12, get835 } from "@cosyte/x12";
```

```js
// CommonJS
const { parseX12, get835 } = require("@cosyte/x12");
```

The single top-level entry point (`@cosyte/x12`) publishes per-condition types (`.d.ts` for `import`,
`.d.cts` for `require`), gated by `attw` on every release, and resolves under both `node16` and legacy
`node10` module resolution. Editor IntelliSense matches the build you actually load.

## PHI discipline

Every example in this documentation uses **synthetic** fixtures — fabricated names, obviously-fake IDs,
pre-2024 control numbers. Do the same in your own tests: X12 healthcare interchanges carry PHI, and a
real interchange committed to a repository is a leak the moment it publishes. See
[Troubleshooting](./troubleshooting) for how the parser keeps field content out of its warnings and
logs.
