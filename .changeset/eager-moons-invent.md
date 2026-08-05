---
"@cosyte/x12": patch
---

An unparseable decimal no longer becomes a confident zero in silence
(`X12-QUANTITY-SILENT-DEFAULTS`).

`elementDecimalOrZero` returned `X12Decimal.ZERO` for a decimal element that was **present** and did
not decode, with no warning on any channel. A payer amount of `1,234.56` (a thousands separator,
which X12 forbids in an R-type element), `$450.00`, `450.00USD` or `N/A` read back as `0` and was
indistinguishable from a payer that paid nothing. A fabricated amount presented as read is the same
harm class as a mis-read quantity: it is a number nobody sent, arriving as though somebody had.

The same root cause one type away: `elementDecimal` answered `undefined` for **both** "the sender
omitted this element" and "the sender sent bytes this library could not read", also unwarned. So
`undefined` at a quantity site meant "not decoded" rather than "absent", and no consumer could tell
which.

Every decimal read in all six transaction readers (835, 837P/I/D, 277 / 277CA, 271, 834, 820) now
routes through a warning sink and emits the new Tier-2 code **`X12_UNPARSEABLE_DECIMAL`** at the
failing `position.elementIndex`. Measured on nine probes across those readers, one per site class,
each substituting a single numeric token in a committed fixture: at `0.0.9` **seven of the nine were
completely silent**. The two that were not were the 835's `BPR-02` and `CLP-04`, which produced only
`X12_835_REMIT_BALANCE_MISMATCH` - a warning that names an equation, never an element, and that
exists in no other reader. All nine now carry `X12_UNPARSEABLE_DECIMAL` naming the element.

Also new, and public: `readElementDecimal(seg, n, delimiters)`, the pure primitive underneath both
helpers, returning `{ value, status }` with `status` one of `"decoded"` / `"absent"` /
`"unparseable"`. `elementDecimal` and `elementDecimalOrZero` each gained an optional 4th
`X12DecimalWarningSink` argument (`{ warnings, position }`); the helper narrows the position to the
failing element itself. Existing 3-argument calls still compile and are still silent, on purpose.

**What did NOT change, deliberately.** The model is unchanged: a slot typed `X12Decimal` still reads
`X12Decimal.ZERO`, an optional slot still reads `undefined`, and some rows are dropped whole. The
warning is a property of the READ rather than of what the reader then does with the result, so every
one of those outcomes carries it; no list of them is published, because a first draft enumerated
three and a review measured a fourth. A slot typed `X12Decimal` cannot express "did not decode", and
changing every such slot to `X12Decimal | undefined` is a breaking model change that belongs in its
own slice. A consumer that reads only the model and never looks at `.warnings` therefore sees exactly
what it saw before. Gate on the warning.

An **absent** element still returns `X12Decimal.ZERO` and still does **not** warn: "missing means
zero" is the documented convention of the slots that use that helper and is unchanged. That does
**not** make every unwarned `0` trustworthy, and the inversion is the one thing to refuse here: the
warning is a property of a decimal READ, not of a model slot, so a slot a reader never read cannot
warn and still holds whatever it was seeded with. `get837Claims` had exactly such a hole, which was
`PRE-EXISTING` and untouched by this change and is closed **in this same release** by
`X12-837-SV-SILENT-ZERO` and its own warning code, `X12_837_SERVICE_LINE_NOT_DECODED`. The
guarantee this change makes is still exactly this: **an unwarned `0` at an element a reader decoded
is a zero the sender sent or omitted.** `KNOWN-LIMITATIONS.md` carries it with the measured instance.

The offending bytes never reach the warning message. They are sender-controlled, and a monetary
element is exactly where a mis-mapped identifier lands, so the message is a frozen-registry lookup
like every other warning in this library and the verbatim bytes stay on `tx.segments[…].raw`.
