---
id: read-large-files
title: Read a large file one transaction set at a time
sidebar_label: Read large files
description: "Read an X12 file far larger than memory with readTransactionSets, and what parseX12 builds when, so a large interchange costs only what you read."
---

# Read a large file one transaction set at a time

You have a file of many transaction sets (a day of remittances, a batch of claims) that is too
large to hold whole, or you only need some of what is in it. `readTransactionSets` reads the file
as it arrives and hands you one transaction set at a time, and `parseX12` splits a transaction
set's segments only when you first read them.

## Read as the file arrives

`readTransactionSets` takes any iterable or async iterable of chunks, such as a Node `Readable`,
and yields each transaction set as soon as its `SE` closes it. It keeps nothing it has yielded, so
the memory it holds is about one transaction set, whatever the size of the file.

```ts runnable
import { get835, readTransactionSets } from "@cosyte/x12";

const isa =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~";
const chunks = [
  `${isa}GS*HP*SENDER*RECEIVER*20260601*1200*1*X*005010X221A1~ST*835*0001~BPR*I*10*C*CHK`,
  "************20260601~TRN*1*CHECK1*9999999999~N1*PR*SAMPLE PAYER~N1*PE*SAMPLE CLINIC*XX*",
  "1234567893~SE*6*0001~GE*1*1~IEA*1*000000001~",
];

const payments: string[] = [];
for await (const { delimiters, transaction } of readTransactionSets(chunks)) {
  const remit = get835(delimiters, transaction);
  payments.push(remit?.payment.totalActualPayment?.toString() ?? "");
}
payments; // => ["10"]
```

A chunk may end anywhere, inside a segment or inside the ISA. A segment that spans many chunks,
such as a large binary attachment, is searched once as its chunks arrive, so the time it takes
grows with its length. Bytes are read one character per byte, as `parseX12` reads a `Buffer`. Each yielded item carries the interchange's `delimiters` and
`isa`, the indexes of its group and of itself in that group, and the transaction set itself, which
is the one `parseX12` of the whole file holds at the same place.

Warnings reach `onWarning` in the order and at the positions `parseX12` reports them, as they are
found: a warning on a transaction set before the set is yielded, and one about its group or the
interchange (a count or control number that does not match, a missing `GE` or `IEA`) when the
stream reaches it. `{ strict: true }` throws the first warning, and the four fatal errors are the
ones `parseX12` throws for the same input.

A transaction set the stream yields keeps a reference to about one chunk of input for as long as
you hold it: its segments are slices of the text of the chunk they arrived in, and in V8 (Node.js)
a slice keeps the text it was cut from. A set with a segment that spanned many chunks keeps that
segment's chunks. Let each set go once you have read it, or keep only the values you read from it,
and the stream holds about one transaction set; keep every set and you keep about a chunk for each.

The stream yields transaction sets only. A `TA1` at the envelope level, a segment outside every
transaction set and bytes after the `IEA` are reported through their warnings and not kept; read
the file with `parseX12` when you need them.

## What parseX12 builds, and when

`parseX12` frames every segment and finds every warning during the parse, but leaves the split of
a segment into its elements for the first read of its transaction set's `segments`, which splits
all of that set's segments at once. A parse that reads a few transaction sets of a large
interchange splits only those. Typed readers such as `get835` read `segments`, so they split the
set they read.

`segments` is an own enumerable property in the place it always was: `Object.keys`, spread,
`JSON.stringify` and destructuring see what they saw before, and after its first read it is a
plain property. Pass `{ lazy: false }` to split every segment during the parse instead. The result
is the same either way.

The built-in profiles are built the same way: `profiles.availity` is built the first time it is
read, and every read after it answers the same profile.
