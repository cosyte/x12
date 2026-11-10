---
"@cosyte/x12": patch
---

Every builder now refuses a `usageIndicator` (ISA-15) that is longer than one character, empty, or not a string, with the builder's own `INVALID_SPEC` code and a message naming `usageIndicator` and ISA-15. Before, the value was written as given, so `usageIndicator: "PT"` pushed ISA-16 off its fixed byte and the builder threw `X12_INVALID_DELIMITERS` from re-reading its own output, which named neither the field nor the builder; an empty one failed the same way, and a number was written as its digits. Leaving `usageIndicator` out still writes `P`.
