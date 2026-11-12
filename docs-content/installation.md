---
id: installation
title: Installation
sidebar_label: Install
description: "Install @cosyte/x12, meet the Node.js prerequisite, and confirm the package resolves from ESM or CommonJS."
---

# Installation

`@cosyte/x12` is a TypeScript ASC X12 toolkit for Node.js. It ships dual **ESM + CJS** builds with
per-condition type declarations, so it works from either module system without configuration, and it
has **zero runtime dependencies**: Node stdlib only.

> **Status:** the 0.1 line, published on npm and public. The `npm install` below is live. Below 1.0 a
> breaking change is called out in the changelog with its migration. Run
> `npm view @cosyte/x12 version` for the current version: it is the source of truth.

## Prerequisites

- **Node.js 22 or later, tested on 22, 24 and 26.** The engine floor is `>=22.0.0`.
- A package manager: `pnpm`, `npm`, or `yarn`.
- **No runtime dependencies.** The parser, serializer, builders, and bundled HIPAA code-list
  snapshots use the Node.js standard library only.

## Install

```bash
npm install @cosyte/x12
```

## Smoke test

Confirm the package resolves and a real entry point is callable. Decode the smallest valid
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
ix.warnings; // => []
```

If that resolves and returns, the install is good. Head to the [Quickstart](./quickstart.md).

## Module systems

`@cosyte/x12` is `"type": "module"` and exposes both conditions, so both of these resolve to the right
build without extra configuration:

```ts runnable
// ESM / TypeScript
import { parseX12, get835 } from "@cosyte/x12";

typeof parseX12; // => "function"
typeof get835; // => "function"
```

```js no-run CommonJS, and the sample runner loads every sample as an ES module
// CommonJS
const { parseX12, get835 } = require("@cosyte/x12");
```

Every entry point, `@cosyte/x12`, the parser alone at `@cosyte/x12/parse` (see
[Import only the parser](./performance.md#import-only-the-parser)), and the fast-check generators at
`@cosyte/x12/arbitraries` (see [Property-test your code](./property-test-your-code.md)), publishes
per-condition types (`.d.ts` for `import`, `.d.cts` for `require`), checked by Are the Types Wrong
(`attw`) on every pull request, and each resolves under both `node16` and legacy `node10` module
resolution. Editor IntelliSense matches the build you actually load.

A process that only parses, and never calls a typed reader, a builder or a code-list lookup, can
import `@cosyte/x12/parse` instead, which loads a fraction of the code:

```ts runnable
import { parseX12, readTransactionSets } from "@cosyte/x12/parse";

typeof parseX12; // => "function"
typeof readTransactionSets; // => "function"
```

## PHI discipline

Every example in this documentation uses **synthetic** data: fabricated names, invented ids, made-up
control numbers. Do the same in your own tests: X12 healthcare interchanges carry PHI, and a real
interchange committed to a repository is a leak the moment it publishes.
[Keeping PHI out of logs](./keeping-phi-out-of-logs.md) says how the package keeps field content out
of its warnings, and what it leaves to you.
