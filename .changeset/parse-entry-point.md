---
"@cosyte/x12": patch
---

Import the parser alone from the new `@cosyte/x12/parse` entry point, a smaller import for a process that only parses: it loads none of the code lists, loop specifications, typed readers, builders or serializer.

- `@cosyte/x12/parse` exports `parseX12`, `readTransactionSets`, segment and element decoding (`decodeSegment`, `getSegmentValue`, `elementValue`, `readElementDecimal` and the rest), `escapeRelease`, `unescapeRelease`, `detectDelimiters`, `X12Decimal`, `X12ParseError`, `FATAL_CODES`, `WARNING_CODES`, `ALL_WARNING_MESSAGES`, and their types, for `import` and `require`, each with its own types.
- Every name it exports is the same binding `@cosyte/x12` exports: the build now shares one copy of the parser between the two in a chunk file beside them, so an `X12ParseError` is one class to `instanceof` and `setDefaultProfile` from `@cosyte/x12` reaches `parseX12` from `@cosyte/x12/parse`.
- `@cosyte/x12` exports everything it did. Nothing a caller must change.
